# Mail Clipper

This tool helps to create a focused environment, highlighting the crucial unread emails by sorting them based on severity and sentiment.


## Table of Contents

- [Introduction](#introduction)
- [Features](#features)
- [Technologies](#technologies)
- [Installation](#installation)
- [Usage](#usage)
- [Screenshots](#screenshots)
- [Demo Video](#demo-video)


## Introduction

Mail Clipper is a web application developed using the EJS, Passport.js, Express.js, Node.js, and MongoDB stack. It incorporates the gpt-3.5-turbo-1106 model for summarization, sentiment analysis, and severity assessment.

## Features

- Google OAuth 2.0 authentication
- Filter emails into categories such as Urgent, Moderate, Routine, and Ignore for easy grouping and organization.
- Date Filter to shortlist emails based on date, displaying summarized emails by default in descending order from the most recent to the last.
- Improve readability by adding an 'Open in Gmail' button so users can easily access the actual email for a better reading experience.

## Technologies

The Classroom Project is built using the following technologies:

- Frontend: EJS, CSS
- Backend: Node.js, Express.js
- Database: MongoDB 
- User Authentication: Passport.js

## Installation

It is recommended to run this project locally to maintain control over critical Gmail data.
Follow the below steps:

1. Clone the repository: ```https://github.com/dublin74/Mail-Clipper.git```
2. Install dependencies: ```npm install``` or ```npm i```
3. Create a .env file and update the following credentials created by you
```
MONGO_DB = "your-mongodb-connection-string"
CLIENT_ID = "your-client-id-here"
ClIENT_SECRET = "your-client-secret-here"

OPENAI_API_KEY "your-api-key-here"
```
4. Start the server: ```node app.js```

### Important Note

> While creating the client_id and client_secret on the Google Cloud console, remember to use the correct scope for accessing Gmail data ```https://www.googleapis.com/auth/gmail.readonly```, and don't forget to put the callback URL; by default, it is ```http://localhost:3000/auth/google/callback```.

## Usage

After installation, you can access Mail Clipper in your web browser at ```http://localhost:3000```. Login with your Gmail account, and you are good to go. 

## Screenshots
![login page](https://github.com/dublin74/Mail-Clipper/assets/89651266/c4efeaaf-169c-4b94-8436-492a35272f73)
![home page](https://github.com/dublin74/Mail-Clipper/assets/89651266/a23771aa-ecdf-4ee4-ae68-6979e43d50ee)
![home page 2](https://github.com/dublin74/Mail-Clipper/assets/89651266/778e5771-4d24-4983-bed1-c176f43c5c09)

## Demo Video


https://github.com/dublin74/Mail-Clipper/assets/89651266/081b32f4-ed0e-4b08-838e-01b303f6ebd5









## Support

If you encounter any problems or need assistance with Mail Clipper, please contact me at lakshyakhichar@gmail.com.
