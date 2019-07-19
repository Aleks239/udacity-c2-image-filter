export const config = {
    "dev": {
      "jwt_secret": process.env.JWT_SECRET,
    },
    "prod": {
      "username": "",
      "password": "",
      "database": "udagram_prod",
      "host": "",
      "dialect": "postgres"
    }
  }
  