const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const { google } = require('googleapis');
const { htmlToText } = require('html-to-text');
const passport = require('passport');
const Email = require('./models/email.js');
const User = require('./models/user.js');
const cron = require('node-cron');
require('dotenv').config()

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
// Configure OpenAI
const OpenAI = require('openai');
const openai = new OpenAI();

// Import authentication configuration
require('./auth');

const app = express();

// Configure Express
app.set('view engine', 'ejs');
app.use(express.static('public'));

// Set up session middleware
app.use(
  session({
    secret: 'crackable_if_tired_enough',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
  })
);

// Connect to MongoDB
mongoose.set('strictQuery', true);
mongoose.connect(process.env.MONGO_DB, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Define routes
app.get('/', (req, res) => {
  res.render('login');
});

app.get(
  '/auth/google',
  passport.authenticate('google', {
    scope: ['profile', 'email', 'https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/gmail.modify'],
    prompt: 'consent',
    accessType: 'offline',
  })
);

app.get(
  '/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/' }),
  async (req, res) => {
    try {
      if (!req.user || !req.user.refreshToken) {
        throw new Error('No refresh token found.');
      }

      await req.user.save();
      req.session.userId = req.user.googleId; 
      req.session.user = req.user.displayName; 

      res.redirect('/gmail');
    } catch (error) {
      console.error('Error saving refresh token:', error);
      res.redirect('/');
    }
  }
);


function findBody(payload) {
  if (payload?.parts) {
    return payload.parts.map((part) => findBody(part)).join('');
  }
  if (payload.mimeType === 'text/plain' && payload.body.data) {
    return Buffer.from(payload.body.data, 'base64').toString();
  }
  if (payload.mimeType === 'text/html' && payload.body.data) {
    const html = Buffer.from(payload.body.data, 'base64').toString();
    return htmlToText(html);
  }
  return '';
}


const MAX_TOKENS = 15900;
// Summarize email content using OpenAI
async function summarizeEmail(content) {
  // Truncate the email body if it's too long
  if (content.length > MAX_TOKENS) {
    content = content.substring(0, MAX_TOKENS);
  }
  const summaryResponse = await openai.chat.completions.create({
    messages: [
      {
        role: "system",
        content: "You are a helpful assistant designed to output JSON.",
      },
      { role: "user", content: `Summarize and analyze the following email:

      **Email Content:**
      ${content}
      
      **Instructions:**
      1. Provide a concise summary of the main points and crucial information in the email(take into account if it is a mail thread content).
      2. Filter emails based on sentiment(positive, negative, or neutral)one out of 3.
      3. Filter email based on motive(informational, action requests, meeting invitations, collaboration opportunities appreciation/recognition, and Resolution Issues)(multiple options).
      4. Urgency/Severity: High, Medium or Low(1 out of 3) give low severity for spam or newsletter.
      
      For the above points, use the following format:
      1. summary:
      2. sentiment: lowercased
      3. motive: First letter caps, rest small for each motive
      4. severity: lowercased
      Please use your natural language understanding to capture the essence of the message.` },
    ],
    model: "gpt-3.5-turbo-1106",
    response_format: { type: "json_object" },
  });
  // console.log(JSON.parse(summaryResponse.choices[0].message.content));
  return JSON.parse(summaryResponse.choices[0].message.content.trim());
}


async function fetchAndSaveEmails(req, res) {
  try {
    // Check user authentication
    if (!req.user || !req.user.refreshToken) {
      return res.send('User is not authenticated');
    }


    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({
      refresh_token: req.user.refreshToken,
      access_token: req.user.accessToken,
    });

    // Handle token refresh
    oauth2Client.on('tokens', (tokens) => {
      if (tokens.refresh_token) {
        req.user.refreshToken = tokens.refresh_token;
      }
      if (tokens.access_token) {
        req.user.accessToken = tokens.access_token;
      }
      req.user.save();
    });

    // Initialize Gmail API
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Fetch unread messages
    const [listResponse] = await Promise.all([
      gmail.users.messages.list({
        userId: 'me',
        q: 'is:unread newer_than:1d -in:Promotions -in:Spam -in:Social',
      })
    ]);

    const [messages] = await Promise.all([
      Promise.all(listResponse.data.messages.map(message =>
        gmail.users.messages.get({ userId: 'me', id: message.id })
      ))
    ]);

    // Process and save emails
    const emails = await Promise.all(
      messages.map(async (message, index) => {
        try {
          const existingEmail = await Email.findOne({ id: message.data.id });
          if (existingEmail) {
            console.log('Email already exists in the database');
            return existingEmail;
          }

          const headers = message.data.payload.headers;
          const fromHeader = headers.find((header) => header.name === 'From').value;
          const match = fromHeader.match(/(.*)<(.*)>/);
          const personName = match ? match[1].trim() : fromHeader;
          const personEmail = match ? match[2].trim() : '';

          let content1 = findBody(message.data.payload);
          content1 = content1.replace(/https?:\/\/[^\s]+/g, '');

          const summaryResult = await new Promise((resolve, reject) => {
            setTimeout(async () => {
              try {
                const result = await summarizeEmail(content1);
                resolve(result);
              } catch (err) {
                reject(err);
              }
            }, index * 25000);
          });

          return {
            id: message.data.id,
            threadId: message.data.threadId,
            labelIds: message.data.labelIds,
            personName,
            personEmail,
            date: new Date(Number(message.data.internalDate)),
            time: new Date(Number(message.data.internalDate)).toLocaleTimeString(),
            from: fromHeader,
            subject: headers.find((header) => header.name === 'Subject').value,
            content: content1,
            summary: {
              summary: summaryResult.summary,
              sentiment: summaryResult.sentiment,
              motive: summaryResult.motive,
              severity: summaryResult.severity,
            }
          };
        } catch (err) {
          console.log(err);
          return null;
        }
      })
    );

    // emails.sort((a, b) => b.date - a.date);
    emails.sort((a, b) => {
      const dateA = new Date(a.date + 'T' + a.time + 'Z');
      const dateB = new Date(b.date + 'T' + b.time + 'Z');
      return dateB - dateA;
    });

    for (const email of emails) {
      const emailDoc = new Email(email);
      await emailDoc.save();
    }

    // res.redirect('/home');
  } catch (err) {
    console.error('Error fetching messages:', err);
    res.status(500).send('Error fetching messages');
  }
}


// Main Gmail route
app.get('/gmail', async (req, res) => {
  try {
    await fetchAndSaveEmails(req, res);
    res.redirect('/home');
  } catch (err) {
    console.error('Error fetching messages:', err);
    res.status(500).send('Error fetching messages');
  }
});

// Helper function: Determine email class
function determineClass(severity, sentiment) {
  if (severity === 'high' && (sentiment === 'negative' || sentiment === 'neutral')) {
    return 'urgent';
  } else if (severity === 'medium' || (severity === 'high' && sentiment === 'positive')) {
    return 'moderate';
  } else if (severity === 'low' && sentiment === 'positive') {
    return 'routine';
  } else {
    return 'ignore';
  }
}

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  console.error("User is not authenticated");
  res.redirect('/');
}

// Home route to display emails
app.get('/home', ensureAuthenticated, async (req, res) => {
  const userId = req.session.userId;
  // console.log('userId:', userId);
  const user = await User.findOne({ googleId: userId });
  // console.log('user:', user);
  if (req.query.date) {
    const date = new Date(req.query.date);
    date.setDate(date.getDate() - 7);
    emails = await Email.find({ date: { $gte: date } });
  } else {
    emails = await Email.find();
  }
  res.render('home', { user, emails, determineClass });
});


app.get('/refresh', async (req, res) => {
  try {
    await fetchAndSaveEmails(req, res);
    res.redirect('/home');
  } catch (err) {
    console.error('Error fetching messages:', err);
    res.status(500).send('Error fetching messages');
  }
});


app.get('/signout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});


app.listen(3000, () => {
  console.log(`Server is listening on port 3000`);
});
