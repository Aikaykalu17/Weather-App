'use strict';

import {
  showError,
  updateMainDisplay,
  renderDailyForecast,
  hideError,
  renderHourlyForecast,
  handleDaySelection,
  hideSkeletonLoading,
  populateDaySelect,
} from './view.js';


import { state } from './state.js';
import { convertHourlyDataToObjects } from './helpers.js';


/* ---------- Fetch helpers ---------- */
export const fetchData = async function (url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Fetch failed: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    showError('Network request failed. Please check connectivity.', null);
    console.error(error);
    return null;
  }
};

export const getCoordinates = async function (placeName) {
  const geocodingURL = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
    placeName
  )}&count=1`;
  try {
    const response = await fetch(geocodingURL);
    if (!response.ok) {
      showError('Geocoding service returned an error. Please try again.', {
        placeName,
      });
      throw new Error(`Geocoding HTTP error: ${response.status}`);
    }
    const data = await response.json();
    if (data && data.results && data.results.length > 0) {
      const topResult = data.results[0];
      return {
        latitude: topResult.latitude,
        longitude: topResult.longitude,
        cityName: topResult.name,
        country: topResult.country,
        timezone: topResult.timezone,
      };
    }
    showError(`Location not found: ${placeName}`, { placeName });
    return null;
  } catch (error) {
    showError('Geocoding failed. Please check your connection and try again.', {
      placeName,
    });
    console.error('Error during geocoding:', error);
    throw error;
  }
};

export const reverseGeocodeCoordinates = async function (lat, lon) {
  // Skip geocoding attempt when on localhost to avoid CORS errors
  const isLocalhost =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';

  // Only try geocoding API if NOT on localhost
  if (!isLocalhost) {
    try {
      const geocodeResponse = await fetch(
        `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${lat}&longitude=${lon}&count=1`
      ).catch(() => null);

      if (geocodeResponse?.ok) {
        const data = await geocodeResponse.json();
        if (data?.results?.[0]) {
          return {
            latitude: lat,
            longitude: lon,
            cityName: data.results[0].name || 'Local Area',
            country: data.results[0].country || 'Nigeria',
            timezone: data.results[0].timezone || 'UTC',
          };
        }
      }
    } catch (e) {
      // Silently continue to timezone fallback
    }
  }

  // Fallback: use the forecast endpoint which has CORS enabled
  try {
    const tzRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&timezone=auto`
    );
    if (tzRes?.ok) {
      const tzJson = await tzRes.json();
      const timezone = tzJson.timezone || 'UTC';
      const parts = timezone.split('/');
      const inferredCityName =
        parts.length > 1 ? parts.pop().replace(/_/g, ' ') : 'Lagos';
      return {
        latitude: lat,
        longitude: lon,
        cityName: inferredCityName,
        country: 'Nigeria', // For Nigerian coordinates, we know the country
        timezone,
      };
    }
  } catch (err) {
    // Silently handle any errors and return safe defaults
  }

  // Return safe defaults if anything fails
  return {
    latitude: lat,
    longitude: lon,
    cityName: 'Lagos',
    country: 'Nigeria',
  };
};

/* ---------- Build grouped daily data ---------- */
export const buildDailyDataFromHourly = hourly => {
  if (!hourly || !hourly.time || !Array.isArray(hourly.time)) return {};
  const combinedForecast = hourly.time.map((timeValue, index) => {
    return {
      time: timeValue,
      temperature:
        hourly.temperature_2m && hourly.temperature_2m[index] !== undefined
          ? hourly.temperature_2m[index]
          : hourly.temperature && hourly.temperature[index],
      weathercode: hourly.weather_code[index],

      // add other props if needed (weathercode, etc.)
    };
  });
  const getDateOnly = isoTimeString =>
    typeof isoTimeString === 'string' ? isoTimeString.substring(0, 10) : '';

  return combinedForecast.reduce((acc, forecast) => {
    const date = getDateOnly(forecast.time);
    if (!date) return acc;
    if (!acc[date]) acc[date] = [];
    acc[date].push(forecast);
    return acc;
  }, {});
};

/* ---------- Main fetch & display ---------- */
export const getAndDisplayWeather = async function (coords) {
  if (!coords || (!coords.latitude && coords.latitude !== 0)) {
    showError('No search result found! Please try another location.');
    console.error('Invalid coordinates received. Cannot fetch weather data');
    return;
  }
state.currentDisplayCoords = coords;

  const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${
    coords.latitude
  }&longitude=${
    coords.longitude
  }&hourly=temperature_2m,weather_code,apparent_temperature,windspeed_10m,relative_humidity_2m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=${encodeURIComponent(
    coords.timezone || 'auto'
  )}&current_weather=true&forecast_days=7`;
  try {
    const response = await fetch(forecastUrl);
    if (!response.ok) {
      showError('Weather API returned an error. Please try again.', { coords });
      return;
    }
    // throw new Error(`Weather API failed: ${response.status}`);
    const weatherData = await response.json();
    if (!weatherData || !weatherData.current_weather) {
      showError('Incomplete weather data received from API.', { coords });

      console.error('Incomplete weather data received. Cannot update UI.');
      return;
    }

    state.globalCoords = coords;
    state.globalWeatherData = weatherData;

    updateMainDisplay(coords, weatherData);
    renderDailyForecast(weatherData);

    // Hides the error panel after successful update (if previuously shown);
    hideError();

    if (weatherData.hourly) {
      const dailyData = buildDailyDataFromHourly(weatherData.hourly);
      populateDaySelect(dailyData);
      const firstDayDateKey = Object.keys(dailyData)[0];

      if (firstDayDateKey) {
        renderHourlyForecast(dailyData[firstDayDateKey]);
      } else {
        // fallback
        renderHourlyForecast(
          convertHourlyDataToObjects(weatherData.hourly).slice(0, 8)
        );
      }
      handleDaySelection(dailyData);
    } else {
      renderHourlyForecast(state.globalHourlyForecastsArray);
    }
  } catch (error) {
    // Show error with retry context
    showError(
      'Failed to fetch weather data. Please check your connection and retry.',
      { coords }
    );
    hideSkeletonLoading();
    console.error('Error fetching weather data:', error);
  }
};
