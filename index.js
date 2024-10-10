const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.post('/webhook', (req, res) => {
  const city = req.body.queryResult.parameters['geocity'];
  const startDate = req.body.queryResult.parameters['startdate'];
  const endDate = req.body.queryResult.parameters['enddate'] || startDate; // Use start-date if end-date is not provided
  getWeatherForecast(city, startDate, endDate, res);
});

const getWeatherForecast = async (city, startDate, endDate, res) => {
  const apiKey = '2efa806c7445c85a7d7c82542d188a67';
  const geocodeUrl = `http://api.openweathermap.org/geo/1.0/direct?q=${city}&limit=1&appid=${apiKey}`;

  try {
    // Get the coordinates of the city
    const geocodeResponse = await axios.get(geocodeUrl, { timeout: 10000 });
    if (geocodeResponse.data.length === 0) {
      throw new Error('City not found');
    }
    const { lat, lon } = geocodeResponse.data[0];

    console.log(`Coordinates: lat=${lat}, lon=${lon}`);

    // URL for 5-day/3-hour forecast
    const weatherUrl = `http://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}`;
    const weatherResponse = await axios.get(weatherUrl, { timeout: 10000 });
    const forecastList = weatherResponse.data.list;

    // Convert start and end dates to Date objects
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Check if the user has requested weather for more than one day
    const isMultipleDays = (end - start) / (1000 * 60 * 60 * 24) > 1;

    // Filter and sort the forecast data by date
    const forecastForDateRange = forecastList.filter(forecast => {
      const forecastDate = new Date(forecast.dt * 1000);
      return forecastDate >= start && forecastDate <= end;
    }).sort((a, b) => a.dt - b.dt);

    if (forecastForDateRange.length === 0) {
      throw new Error('No forecast data available for the specified date range');
    }

    // Format the forecast data
    const forecastText = forecastForDateRange.map(forecast => {
      const dateTime = new Date(forecast.dt * 1000).toLocaleString();
      const weather = forecast.weather[0].description;
      const temp = (forecast.main.temp - 273.15).toFixed(2);
      return `${dateTime}: ${weather}, ${temp}°C`;
    }).join('\n');

    const responseText = isMultipleDays
      ? `The weather forecast for ${city} from ${startDate} to ${endDate} is:\n${forecastText}`
      : `The weather forecast for ${city} on ${startDate} is:\n${forecastText}`;

    res.json({
      fulfillmentText: responseText
    });
  } catch (error) {
    console.error('Error fetching weather data:', error.response ? error.response.data : error.message);
    res.json({
      fulfillmentText: `I couldn't fetch the weather for ${city}. Please try again later.`
    });
  }
};

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
