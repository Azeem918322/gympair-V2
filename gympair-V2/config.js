const sgMail = require("@sendgrid/mail");
sgMail.setApiKey("");
module.exports = {
  dbURI:
    "mongodb+srv://gympair:gympair6565@cluster0.enihc.mongodb.net/gympair_dev2?retryWrites=true&w=majority",
  HOST: "gympair.com",
  DB: "Gympair",
  apiUrl: "https://gympair.com:2000",
  apiPort: process.env.PORT || 2000,
  secret: "nhgYjhbFD97e3",
  SG: sgMail,
  appID: "a7519859-8401-4870-8cca-3a1f70eb4854",
  APIKey: "ZDFkNGYzZjgtNWUzNC00MWRjLTg4ODEtZjFiODM1YTRhOGVl",
  OSUrl: "https://onesignal.com/api/v1",
  googleServiceAccountClientEmail:
    "gpv2-795@gympair-346504.iam.gserviceaccount.com",
  googleServiceAccountPrivateKey:
   "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC6y8Am4CvRJAaG\nztvDaxmTbkhNyEjTQlBydqMu60Lya4bmtC301NIl61i+iLDcbYrmmoDzyuhx8S0M\nGw6LDU6HMc70lP4ycFxoViUi3nmoY3IMg7pZyDlvQO35YOzUduA63RHEcqETFybk\no7RZnyvmu5T4ptvjMicJu1Rg78UFBNTLFYjJIt6t/y1Ufb8rXMkXkZQFqtz8Ol0Q\n8deXM4c9+JPUmGA8QkvOtnZsQqoN4xIH1T3XAcKYeERfs0nSEyJhW+qRgNAgp9CQ\nYdu6/mYgTa7s2ldy3qjP1/Fni5r9Z/4GQSWfYOf9lr43qypD0cMoEUwHfPsyJ023\nCWjnrzwHAgMBAAECggEADzkdrs1kJMY31fKzzEhFLFO3hsdE0Bq+baWnhOJdcV47\n/z89448YlUiJ0fVX3I782/BJhBTMPsT189+cns510OTJRfuCf9/SWBp1KlNRPNzl\n5YkyvbBopd13x3QTuPj7KzDrCsSAxgqD++wvfYJQVJyC9oS6tNhYgB2JMeE4gEER\npf6I0E9aWImixZCIZGR/7GZYoPY5Dd9EujE/C4C8GyJl2BpcpxSJ+VGPJ5yH03EP\n9k+IgmhVGAglo3zsGf7jI23qOuo1IHsUJrsjbrkxV8wZnCBLuqQo24ZwUS9jyFG+\nXSHCx8ixaJ+N3Mekd5YCsAAQFs6Tp2neoB/QzSgRUQKBgQD2H3RzsuN9+9+6o8XG\nnOwL20yEgXB/f5TLUsM29agP7FPLdBi/m3TvXzQhMNgaOvoW7AottE2jha4QYF9n\nAH0PHyu0cpT1zoUnhCE8CFtugdJJYoPGSbX73cXD96vkpazjWq0S6UruvwFyl6OL\nRuA+7mYY2vgkHF1XHP5U73AoPwKBgQDCSsy1eMkyNTccc+ElU9+vPo66ti3m/yXN\n39S+yq4jlu2LDI+yMply+FOsXNbdeTyBZMS+p9DbIzf7KyhiXgZfEgPX8b/NWLEt\nWMjWDuwC1d5/pujcFIGEE1IsTgApxlSkhqpdgW9O1ZFjxDGMhg0o3jpp6t6Li9Fw\nTJDC62g6OQKBgQCzaCJe5BtoDl37kr3sFR8LVYPlYuU6SymPPHkIavFjCgXa3Hnd\n0dffVSqOtygPlsYOR2jz/+ZIOH21ekqQro56o2IcWxmyRCRTtcD0HbNoTkGXNLSR\nqdF6EyLBwpwOQ6ZO5B4dFumENr87ZMXWFIgJ14WcwKD40aRIh93s08yRyQKBgDbs\n7GgU6FPgRV8uxyRFTMP+3FyeKeXWlXpY34y8QXRgM3EOsQTAVy7wUr80U62ym089\nDH2VdW6tyyKfNcBxMj3oGtwORJmpjBT0t3oEJ+Y5TbgqmEO3LFIJID7UIimtHrqQ\nM1NRxwSzTXG1wggm0UuPX1YYBqfOc/vaOUZRRFrJAoGBAINzESluiBILewiNH83x\nAwfxTW/KmWWT/GGGkezZItKBbhjWvKAI7XH8SzZKSsKBsiP516821FcMTvFd7Hf2\nOvF4n8cKAnYSS9EQfjaORlFBEY5Ha8BehrKPTfRZCAlqyiycTqmYsHBLWS/R+muk\nTmuoSLfmwqlxVy8bIG6JN+Ia\n-----END PRIVATE KEY-----\n"
  ,maintenance:true
  };
