# Raster Position API Integration

This project is a Node.js integration developed to synchronize vehicle position data from the Raster API to a PostgreSQL database. It automatically manages authentication (OAuth2), data validation, and historical storage.

## 🚀 Features

- **Automatic Token Management**: Checks token validity in the database and requests a new one only when necessary.
- **Position Synchronization**: Fetches the latest vehicle positions via the Raster API.
- **Data Validation**: Ignores records without a valid position date and prevents duplicates.
- **Smart Upsert**: Inserts new positions or updates existing records if critical fields (Latitude, Longitude, Ignition) change.
- **Duplicate Removal**: Dedicated script to maintain data integrity in the database.

## 📋 Prerequisites

- **Node.js**: Version 18 or higher.
- **PostgreSQL**: Database for data storage.
- **Raster Credentials**: Client ID, Client Secret, Username, and Password for API access.

## ⚙️ Configuration

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file in the project root with the following variables:
   ```env
   # Database
   DB_USER=your_user
   DB_HOST=your_host
   DB_DATABASE=your_database
   DB_PASSWORD=your_password
   DB_PORT=5432

   # Raster API (OAuth2)
   client_id=your_client_id
   grant_type=password
   username=your_raster_username
   password=your_raster_password
   client_secret=your_client_secret
   URL_Token=http://integra.rastergr.com.br:8888/datasnap/rest/TWebService/oauth/token
   ```

## 🗄️ Database Schema

The project uses two main tables:

1. `public.pub_token_raster`: Stores the access token and its validity.
2. `public.public_veiculo_posicao_raster`: Stores the historical vehicle positions.

## 🏃 How to Use

To run the main flow (Token -> Query -> Storage):

```bash
node main.js
```

## 📂 Project Structure

- `main.js`: Entry point that coordinates the execution of all modules.
- `Token.js`: Manes the logic for obtaining and renewing the OAuth2 token.
- `ConsultaPosicoes.js`: Makes the call to the positions API and processes the response.
- `db.js`: PostgreSQL connection configuration.
- `Remove_duplicates.js`: Logic for cleaning and maintaining duplicate data.
- `.env`: (Not included) Environment variable configuration file.
