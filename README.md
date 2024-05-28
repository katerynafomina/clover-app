# Clover App

Clover App is a weather-based outfit suggestion application that helps users choose what to wear based on current weather conditions. The app provides functionalities to view the weather, manage a personal wardrobe, and get outfit recommendations.

## Features

- **Weather Display**: Shows the current weather for the user's location.
- **Wardrobe Management**: Allows users to add, view, and delete clothing items.
- **Outfit Recommendations**: Suggests outfits based on the weather.
- **Custom Outfits**: Users can create and save their own outfits.
- **Outfit Calendar**: Tracks past outfits and weather conditions.

## Technologies Used

- **Expo.js**: For building the React Native application.
- **Supabase**: For database management and user authentication.
- **React Native**: For developing the mobile application interface.

## Database Schema

The database consists of several tables managed in Supabase:

### Tables

- **profiles**: Stores user profile information.
- **wardrobe**: Stores information about clothing items.
- **outfits**: Stores information about outfits.
- **outfit_item**: Associates clothing items with outfits.
- **weather**: Stores weather data for different locations.

### Relationships

- `profiles` is connected to `auth.users` for authentication.
- `wardrobe` is linked to `profiles` via `user_id`.
- `outfits` is linked to `profiles` via `user_id` and to `weather` via `weather_id`.
- `outfit_item` connects `outfits` and `wardrobe`.

## Getting Started

### Prerequisites

- Node.js
- Expo CLI
- Supabase account

### Installation

1. Clone the repository:
    ```sh
    git clone https://github.com/katerynafomina/clover-app.git
    cd clover-app
    ```

2. Install dependencies:
    ```sh
    npm install
    ```

3. Configure Supabase:
   - Create a Supabase project.
   - Set up your Supabase URL and API Key in the environment variables.

4. Start the application:
    ```sh
    npm start
    ```

## Usage

1. Register or log in to the application.
2. Add clothing items to your wardrobe.
3. View the weather and get outfit suggestions.
4. Save and manage your outfits.

## Authentication

Supabase handles user authentication, supporting both email/password login and OAuth providers. Users' sessions are managed via tokens stored securely in the application.

## Contribution

Contributions are welcome! Please open an issue or submit a pull request for any improvements.


