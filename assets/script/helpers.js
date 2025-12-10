'use strict';


// This is a helper function that displays the corresponding weather icon depending on the weather code.
export const getWeatherIcon = (weatherCode) => {
  switch (weatherCode) {
    // Clear sky
    case 0:
      return { src: "/assets/images/clear-sky.webp", alt: "Clear sky icon" };

    // Partly cloudy,
    case 2:
      return { src: "/assets/images/icon-partly-cloudy.webp", alt: "Partly Cloudy Icon" };

    // Mainly clear, and overcast
    case 1:
    case 3:
      return { src: "/assets/images/icon-overcast.webp", alt: "Overcast Icon" };

    // Fog and depositing rime fog
    case 45:
    case 48:
      return { src: "/assets/images/icon-fog.webp", alt: "Fog Icon" };

    // Drizzle (light, moderate, dense)
    case 51:
    case 53:
    case 55:
      return { src: "/assets/images/icon-drizzle.webp", alt: "Drizzle Icon" };

    // Rain (slight, moderate, heavy)
    case 61:
    case 63:
    case 65:
    case 66:
    case 67:
    case 80:
    case 81:
    case 82:
      return { src: "/assets/images/icon-rain.webp", alt: "Rain Icon" };

    // Snow Fall
    case 71:
    case 73:
    case 75:
      return { src: "/assets/images/icon-snow.webp", alt: "Snow Icon" };

    // Thunderstorm (with/without hail)
    case 95:
    case 96:
    case 99:
      return { src: "/assets/images/icon-storm.webp", alt: "Storm Icon" }

    // Default (or any case not explicitly handled)
    default:
      return { src: "/assets/images/icon-overcast.webp", alt: "Sunny Icon" }

  }
}
//////////////////////////////////////

/* Normalize hourly API structure -> array of {time, temperature} */
// This fucntion takes raw hourly weather data(time and temperature arrays)
//  and transforms it into a standardised array of simple javaScript objects.
export const convertHourlyDataToObjects = function (hourlyData) {
  if (
    !hourlyData ||
    !hourlyData.time ||
    !Array.isArray(hourlyData.time) ||
    hourlyData.time.length === 0
  ) {
    return [];
  }

  const processedArray = [];
  const loopLimit = hourlyData.time.length;
  
  // Loops from 0 - 168.
  for (let i = 0; i < loopLimit; i++) {
    // Checks if temperature_2m exists, if it does, assign it to temp, 
    // if it doesn't exist use temperature[i]. If both fail, use null.
    const temp =
      hourlyData.temperature_2m && hourlyData.temperature_2m[i] !== undefined
        ? hourlyData.temperature_2m[i]
        : hourlyData.temperature && hourlyData.temperature[i] !== undefined
          ? hourlyData.temperature[i]
          : null;
    processedArray.push({
      time: hourlyData.time[i],
      temperature: temp,
    });
  }
  // This has been converted to a standardised array of simple javaScript objects.
  return processedArray;
};

//   Utilities
// THis function takes a date string, converts it into a javascript date object.
// It must convert a date string into a javaScript Date object because the string alone is just text.
export const getDayName = function (dateString, full = false, tz) {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: full ? 'long' : 'short',
      timeZone: tz,
    });
  } catch {
    return full ? 'Today' : 'Today';
  }
};

export const convertCelsiusToFahrenheit = function (celsius) {
  return parseFloat(((celsius * 9) / 5 + 32).toFixed(1));
};

export const convertKmToMph = function (kmh) {
  return parseFloat((kmh * 0.621371).toFixed(1));
};

export const convertmmToInches = function (mm) {
  return parseFloat((mm * 0.0393701).toFixed(2));
};