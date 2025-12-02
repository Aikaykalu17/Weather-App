'use strict';

let isImperial = false;
let currentDisplayCoords = null;
let globalCoords = null;
let globalWeatherData = null;
let currentTempUnit = 'C';
let currentWindUnit = 'kmh';
let currentPrecipUnit = 'mm';
let currentDayOffset = 0;
let globalHourlyForecastsArray = [];
let lastErrorContext = null;

const main = document.querySelector('main');
const errorSection = document.querySelector('.error-section');
const errorBtn = document.querySelector('.error-btn');

const dayListContainer = document.getElementById('day-list');
const selectDisplay = document.querySelector('.select-display');
const cityName = document.querySelector('.city-name');
const dateElement = document.querySelector('.weather-date');
const tempNumber = document.querySelector('.temp-number');
const weatherIcon = document.querySelector('.sun-svg');
const countryName = document.querySelector('.country-name');
const searchButton = document.querySelector('.search-btn');
const searchInput = document.querySelector('.search-place');
const progressBar = document.querySelector('.progress-bar');


const celsiusButton = document.querySelector('[data-unit="celsius"]');
const fahrenheitButton = document.querySelector('[data-unit="fahrenheit"]');
const kmhButton = document.querySelector('[data-unit="kmh"]');
const mphButton = document.querySelector('[data-unit="mph"]');
const mmButton = document.querySelector('[data-unit="mm"]');
const inchesButton = document.querySelector('[data-unit="inches"]');


const showSkeletonLoading = function () {

  // Announce loading to screen readers
  const loadingStatus = document.getElementById('loading-status');
  if (loadingStatus) {
    loadingStatus.textContent = 'Loading weather data.......'
  }

  const skeletonContainer = document.querySelector('.skeleton-container');
  if (skeletonContainer) {
    skeletonContainer.classList.add('active');
  }

  // Hide actual weather sections
  const header = document.querySelector('.header');
  const weatherPrompt = document.querySelector('.weather-prompt');
  const weatherCurrent = document.querySelector('.weather-current');
  const detailsGrid = document.querySelector('.details-grid');
  const dailyForecast = document.querySelector('.daily-forecast');
  const hourlyForecast = document.querySelector('.hourly-forecast-section');
  const footer = document.querySelector('.attribution');

  if (header) header.style.display = 'none';
  if (weatherPrompt) weatherPrompt.style.display = 'none';
  if (weatherCurrent) weatherCurrent.style.display = 'none';
  if (detailsGrid) detailsGrid.style.display = 'none';
  if (dailyForecast) dailyForecast.style.display = 'none';
  if (hourlyForecast) hourlyForecast.style.display = 'none'
  if (footer) footer.style.display = 'none';
};

const hideSkeletonLoading = function () {

  // Announce loading to screen readers
  const loadingStatus = document.getElementById('loading-status');
  if (loadingStatus) {
    loadingStatus.textContent = 'Weather data loaded successfully'
  }

  const skeletonContainer = document.querySelector('.skeleton-container');
  if (skeletonContainer) {
    skeletonContainer.classList.remove('active');
  }
  const header = document.querySelector('.header');
  const weatherPrompt = document.querySelector('.weather-prompt');
  const weatherCurrent = document.querySelector('.weather-current');
  const detailsGrid = document.querySelector('.details-grid');
  const dailyForecast = document.querySelector('.daily-forecast');
  const hourlyForecast = document.querySelector('.hourly-forecast-section');
  const footer = document.querySelector('.attribution');

  if (header) header.style.display = 'flex';
  if (weatherPrompt) weatherPrompt.style.display = 'flex';
  if (weatherCurrent) weatherCurrent.style.display = 'flex';
  if (detailsGrid) detailsGrid.style.display = 'grid';
  if (dailyForecast) dailyForecast.style.display = 'flex';
  if (hourlyForecast) hourlyForecast.style.display = 'flex'
  if (footer) footer.style.display = 'block';
};

/* ---------- Utilities ---------- */
const getDayName = function (dateString, full = false, tz) {
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

const convertCelsiusToFahrenheit = function (celsius) {
  return parseFloat(((celsius * 9) / 5 + 32).toFixed(1));
};
const convertKmToMph = function (kmh) {
  return parseFloat((kmh * 0.621371).toFixed(1));
};
const convertmmToInches = function (mm) {
  return parseFloat((mm * 0.0393701).toFixed(2));
};

const updateDisplayUnits = function (type, unit) {
  // temperature: unit = 'C' or 'F'
  if (type === 'temperature') {
    document.querySelectorAll('[data-celsius]').forEach(el => {
      const base = parseFloat(el.getAttribute('data-celsius'));
      if (Number.isNaN(base)) return;
      const out = unit === 'F' ? convertCelsiusToFahrenheit(base) : base;
      // numeric text only (templates append unit separately)
      el.textContent = Math.round(out);
    });
    document
      .querySelectorAll('.temp-unit-symbol')
      .forEach(s => (s.textContent = `°${unit}`));
    document
      .querySelectorAll('.temp-unit-symbol-hourly')
      .forEach(s => (s.textContent = `°${unit}`));
    return;
  }

  // wind: unit = 'kmh' or 'mph'
  if (type === 'wind') {
    document.querySelectorAll('[data-kmh]').forEach(el => {
      const base = parseFloat(el.getAttribute('data-kmh'));
      if (Number.isNaN(base)) return;
      if (unit === 'mph') {
        el.textContent = `${convertKmToMph(base).toFixed(1)} mph`;
      } else {
        el.textContent = `${base.toFixed(1)} km/h`;
      }
    });
    return;
  }

  // precipitation: unit = 'mm' or 'inches'
  if (type === 'precipitation') {
    document.querySelectorAll('[data-mm]').forEach(el => {
      const base = parseFloat(el.getAttribute('data-mm'));
      if (Number.isNaN(base)) return;
      if (unit === 'inches') {
        el.textContent = `${convertmmToInches(base).toFixed(2)} in`;
      } else {
        el.textContent = `${base.toFixed(2)} mm`;
      }
    });
    return;
  }
};
/* normalize hourly API structure -> array of {time, temperature} */
const convertHourlyDataToObjects = function (hourlyData) {
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
  for (let i = 0; i < loopLimit; i++) {
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
  return processedArray;
};

const clearAllCheckmarks = function () {
  const allChecks = document.querySelectorAll(
    '.dropdown-content .icon-checkmark'
  );
  allChecks.forEach(check => {
    check.style.visibility = 'hidden';
  });
};

const getLastFetchedCoordinates = function () {
  return currentDisplayCoords;
};

const updateAllUnitCheckmarks = function () {
  // show/hide checkmarks based on isImperial and current units
  const cMark = document.querySelector('[data-unit="celsius"] .icon-checkmark');
  const fMark = document.querySelector(
    '[data-unit="fahrenheit"] .icon-checkmark'
  );
  if (cMark) cMark.style.visibility = !isImperial ? 'visible' : 'hidden';
  if (fMark) fMark.style.visibility = isImperial ? 'visible' : 'hidden';

  const kmMark = document.querySelector('[data-unit="kmh"] .icon-checkmark');
  const mphMark = document.querySelector('[data-unit="mph"] .icon-checkmark');
  if (kmMark)
    kmMark.style.visibility = currentWindUnit === 'kmh' ? 'visible' : 'hidden';
  if (mphMark)
    mphMark.style.visibility = currentWindUnit === 'mph' ? 'visible' : 'hidden';

  const mmMark = document.querySelector('[data-unit="mm"] .icon-checkmark');
  const inMark = document.querySelector('[data-unit="inches"] .icon-checkmark');
  if (mmMark)
    mmMark.style.visibility = currentPrecipUnit === 'mm' ? 'visible' : 'hidden';
  if (inMark)
    inMark.style.visibility =
      currentPrecipUnit === 'inches' ? 'visible' : 'hidden';
};

/* ---------- Build grouped daily data ---------- */
const buildDailyDataFromHourly = hourly => {
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

/* ---------- Populate day select (creates elements if missing) ---------- */
const ensureDaySelectElements = function () {
  const wrapper = document.querySelector('.custom-select-wrapper');
  if (!wrapper) return;
  // create select-display if missing
  if (!document.querySelector('.select-display')) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'select-display';
    btn.setAttribute('aria-expanded', 'false');
    btn.textContent = 'Today';
    wrapper.appendChild(btn);
  }
  // create day list if missing
  if (!document.getElementById('day-list')) {
    const ul = document.createElement('ul');
    ul.id = 'day-list';
    ul.className = 'select-options-list';
    ul.setAttribute('role', 'listbox');
    wrapper.appendChild(ul);
  }
};

const populateDaySelect = dailyData => {
  ensureDaySelectElements();
  const dl = document.getElementById('day-list');
  const sd = document.querySelector('.select-display');
  if (!dl || !sd || !dailyData) return;
  const dayKeys = Object.keys(dailyData);
  if (dayKeys.length === 0) {
    dl.innerHTML = '';
    sd.textContent = 'Today';
    return;
  }
  dl.innerHTML = '';

  const firstDayTime = dailyData[dayKeys[0]][0]?.time;
  const firstDayName = getDayName(firstDayTime, true);
  sd.textContent = firstDayName;

  dayKeys.forEach((datekey, index) => {
    const dayTime = dailyData[datekey][0]?.time || datekey;
    const dayNameFull = getDayName(dayTime, true);
    const isSelected = index === 0;
    const li = document.createElement('li');
    li.className = 'custom-option-selected';
    if (isSelected) {
      li.id = 'selected-day';
    }
    li.setAttribute('role', 'option');
    li.setAttribute('aria-selected', String(isSelected));
    li.setAttribute('data-value', datekey);
    li.setAttribute('aria-labelledby', dayNameFull.toLowerCase());
    li.textContent = dayNameFull;
    dl.appendChild(li);
  });
};

const getWeatherIcon = (weatherCode) => {
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

    // Default (or any cose not explicitly handled)
    default:
      return { src: "/assets/images/icon-overcast.webp", alt: "Sunny Icon" }

  }
}

/* ---------- Handle day selection ---------- */
const handleDaySelection = dailyData => {
  ensureDaySelectElements();
  const dl = document.getElementById('day-list');
  const sd = document.querySelector('.select-display');
  if (!dl || !sd || !dailyData) return;

  // delegate clicks on day list
  dl.removeEventListener('click', dl._dayClickHandler);
  dl._dayClickHandler = function (e) {
    const selectedLi = e.target.closest('li[data-value]');
    if (!selectedLi) return;
    e.stopPropagation();

    const selectedDateKey = selectedLi.getAttribute('data-value');
    const dayArray = dailyData[selectedDateKey];
    if (!Array.isArray(dayArray) || dayArray.length === 0) {
      console.error(
        'Could not find hourly array for date key',
        selectedDateKey
      );
      return;
    }

    const selectedDate = new Date(dayArray[0].time);
    const fullDayName = selectedDate.toLocaleDateString('en-US', {
      weekday: 'long',
    });

    // compute max/min from that day's hourly temps (normalize)
    const temps = dayArray
      .map(hour => (hour.temperature !== undefined ? hour.temperature : null))
      .filter(v => v !== null);
    const maxTemp = temps.length ? Math.max(...temps) : null;
    const minTemp = temps.length ? Math.min(...temps) : null;

    const newDaySummaryData = {
      temperature_2m_max: maxTemp,
      temperature_2m_min: minTemp,
      time: dayArray[0].time,
    };

    renderHourlyForecast(dayArray);
    updateMainSummary(newDaySummaryData);

    sd.textContent = fullDayName;
    sd.setAttribute('aria-expanded', 'false');

    const currentSelected = dl.querySelector('[aria-selected="true"]');
    if (currentSelected) {
      currentSelected.setAttribute('aria-selected', 'false');
      currentSelected.removeAttribute('id');
    }
    selectedLi.setAttribute('aria-selected', 'true');
    selectedLi.setAttribute('id', 'selected-day');
    dl.classList.remove('select-options-list-active');
  };
  dl.addEventListener('click', dl._dayClickHandler);

  // toggle open/close
  sd.removeEventListener('click', sd._toggleHandler);
  sd._toggleHandler = function () {
    const isExpanded = sd.getAttribute('aria-expanded') === 'true';
    sd.setAttribute('aria-expanded', String(!isExpanded));
    dl.classList.toggle('select-options-list-active');
  };
  sd.addEventListener('click', sd._toggleHandler);
};

/* ---------- Render hourly forecast (8 items) ---------- */
const renderHourlyForecast = dayData => {
  const hourlyListContainer = document.getElementById('hourly-items');
  if (!hourlyListContainer) return;

  if (!Array.isArray(dayData) || dayData.length === 0) {
    hourlyListContainer.innerHTML =
      '<li class="forecast-item">No hourly forecast available.</li>';
    return;
  }

  hourlyListContainer.innerHTML = '';
  const HOURS_TO_DISPLAY = 8;

  // Find the current hour's index
  const now = new Date();
  const currentHour = now.getHours();
  const currentIndex = dayData.findIndex(item => {
    const itemHour = new Date(item.time).getHours();
    return itemHour >= currentHour;
  });

  // Get the next 8 hours from current hour
  const startIndex = currentIndex >= 0 ? currentIndex : 0;
  const nextEightHours = dayData.slice(
    startIndex,
    startIndex + HOURS_TO_DISPLAY
  );
  nextEightHours.forEach(forecast => {
    const tempCelsius =
      forecast.temperature !== undefined && forecast.temperature !== null
        ? forecast.temperature
        : 0;
    const displayTempValue = isImperial
      ? convertCelsiusToFahrenheit(tempCelsius)
      : tempCelsius;
    const roundedValue = Math.round(displayTempValue);

    const timeString =
      String(forecast.time).substring(11, 16) || String(forecast.time);
    const hour24 = parseInt(timeString.split(':')[0], 10) || 0;
    const ampm = hour24 >= 12 ? 'PM' : 'AM';
    const hour12 = hour24 % 12 || 12;
    const displayTime = `${hour12} ${ampm}`;

    const hourlyWeatherCode = forecast.weathercode;
    const { src: hourlyIconSrc, alt: hourlyIconAlt } = getWeatherIcon(hourlyWeatherCode);

    // include a small dropdown toggle per hourly item (delegated handler will manage it)
    const li = document.createElement('li');
    li.className = 'forecast-item';

    li.innerHTML = `
      <div class="temp-time">
        <img src="${hourlyIconSrc}" alt="${hourlyIconAlt}" class="icon-overcast hourly-forecast-svg" aria-label="${hourlyIconAlt}" />
        <span class="time">${displayTime}</span>
      </div>
      <div class="temp-block">
        <span class="temp-number-hourly" data-celsius="${tempCelsius}">${roundedValue}</span>
        <span class="temp-unit-symbol-hourly">°${isImperial ? 'F' : 'C'}</span>
      </div>
    `;
    hourlyListContainer.appendChild(li);
  });
};

/* ---------- Update main summary and main display ---------- */
const updateMainSummary = function (dailySummaryData) {
  if (!dailySummaryData) return;
  const maxTemp = dailySummaryData.temperature_2m_max;
  const minTemp = dailySummaryData.temperature_2m_min;

  const currentTempEl = document.querySelector('.temp-number');
  const highTempEl = document.querySelector('.high-temp');
  const lowTempEl = document.querySelector('.low-temp');

  // store base Celsius in data attributes so updateDisplayUnits can convert
  if (currentTempEl) {
    if (maxTemp !== null && maxTemp !== undefined) {
      currentTempEl.setAttribute('data-celsius', String(maxTemp));
      const out = isImperial ? convertCelsiusToFahrenheit(maxTemp) : maxTemp;
      currentTempEl.textContent = isImperial ? `${Math.round(out)}°F` : `${Math.round(out)}°C`;
    } else {
      currentTempEl.removeAttribute('data-celsius');
      currentTempEl.textContent = '-';
    }
  }

  if (highTempEl) {
    if (maxTemp !== null && maxTemp !== undefined) {
      highTempEl.setAttribute('data-celsius', String(maxTemp));
      const out = isImperial ? convertCelsiusToFahrenheit(maxTemp) : maxTemp;
      highTempEl.textContent = Math.round(out);
    } else {
      highTempEl.removeAttribute('data-celsius');
      highTempEl.textContent = '-';
    }
  }

  if (lowTempEl) {
    if (minTemp !== null && minTemp !== undefined) {
      lowTempEl.setAttribute('data-celsius', String(minTemp));
      const out = isImperial ? convertCelsiusToFahrenheit(minTemp) : minTemp;
      lowTempEl.textContent = Math.round(out);
    } else {
      lowTempEl.removeAttribute('data-celsius');
      lowTempEl.textContent = '-';
    }
  }

  document
    .querySelectorAll('.temp-unit-symbol')
    .forEach(s => (s.textContent = `°${isImperial ? 'F' : 'C'}`));
};

const updateMainDisplay = function (coords, weatherData) {
  if (!cityName || !dateElement || !countryName) {
    console.error('Missing DOM elements for main display');
    return;
  }
  if (!weatherData || !weatherData.current_weather) return;

  currentDisplayCoords = coords;
  globalCoords = coords;
  globalWeatherData = weatherData;

  const weatherCode = weatherData.current_weather.weathercode;

  const { src: iconSrc, alt: iconAlt } = getWeatherIcon(weatherCode);

  const mainIcon = document.querySelector('.sun-svg');
  if (mainIcon) {
    mainIcon.setAttribute('src', iconSrc);
    mainIcon.setAttribute('alt', iconAlt)
  }

  const currentTemperature = weatherData.current_weather.temperature;
  const displayTemp = isImperial
    ? convertCelsiusToFahrenheit(currentTemperature)
    : currentTemperature;

  const mainTempEl = document.querySelector('.temp-number');
  if (mainTempEl) {
    mainTempEl.setAttribute('data-celsius', String(currentTemperature));
    mainTempEl.textContent = `${Math.round(displayTemp)}°${isImperial ? 'F' : 'C'
      }`;
  }

  const unitSymbolEl = document.querySelector('.temp-unit-symbol');
  if (unitSymbolEl) unitSymbolEl.textContent = `°${isImperial ? 'F' : 'C'}`;

  // Feels like
  const feelsLikeTemp = weatherData.hourly?.apparent_temperature?.[0] ?? null;
  const feelsLikeDisplay = document.querySelector('.feels-like');
  if (feelsLikeDisplay) {
    const v =
      feelsLikeTemp !== null && isImperial
        ? convertCelsiusToFahrenheit(feelsLikeTemp)
        : feelsLikeTemp;
    if (v !== null && v !== undefined)
      feelsLikeDisplay.textContent = `${Math.round(v)}°${isImperial ? 'F' : 'C'
        }`;
  }

  // Humidity
  const humidity = weatherData.hourly?.relative_humidity_2m?.[0] ?? null;
  const humidityDisplay = document.querySelector('.humidity');
  if (humidityDisplay && humidity !== null) {
    humidityDisplay.textContent = `${Math.round(humidity)} %`;
  }

  // Wind Speed
  const windSpeed = weatherData.current_weather.windspeed ?? 0;
  const windDisplay = document.querySelector('.wind');
  if (windDisplay) {
    windDisplay.setAttribute('data-kmh', String(windSpeed));
    windDisplay.textContent = isImperial
      ? `${convertKmToMph(windSpeed).toFixed(1)} mph`
      : `${windSpeed.toFixed(1)} km/h`;
  }

  // Precipitation
  const precipitationSum = weatherData.daily?.precipitation_sum?.[0] ?? 0;
  const precipitationDisplay = document.querySelector('.precipitation');
  if (precipitationDisplay) {
    precipitationDisplay.setAttribute('data-mm', String(precipitationSum));
    precipitationDisplay.textContent =
      currentPrecipUnit === 'inches'
        ? `${convertmmToInches(precipitationSum)} in`
        : `${precipitationSum} mm`;
  }

  // City / country
  const displayCityName =
    coords && (coords.timezone || coords.cityName)
      ? coords.timezone
        ? coords.timezone.split('/').pop().replace(/_/g, ' ')
        : coords.cityName
      : 'Unknown';
  cityName.textContent = displayCityName + ', ';
  countryName.textContent = coords?.country || '';
  cityName.appendChild(countryName);

  const now = new Date();
  const options = {
    weekday: 'long',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };
  if (coords && coords.timezone && coords.timezone !== 'auto')
    options.timeZone = coords.timezone;
  const formattedDate = now.toLocaleDateString('en-US', options);
  if (dateElement) {
    dateElement.textContent = formattedDate.replace(/,/g, '');
    dateElement.setAttribute('datetime', now.toISOString().split('T')[0]);
  }

  // Update global hourly array for fallback
  if (weatherData.hourly)
    globalHourlyForecastsArray = convertHourlyDataToObjects(weatherData.hourly);
};

/* ---------- Fetch helpers ---------- */
const fetchData = async function (url) {
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

const getCoordinates = async function (placeName) {
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

const reverseGeocodeCoordinates = async function (lat, lon) {
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
/* ---------- Main fetch & display ---------- */
const getAndDisplayWeather = async function (coords) {
  if (!coords || (!coords.latitude && coords.latitude !== 0)) {
    showError('No search result found! Please try another location.');
    console.error('Invalid coordinates received. Cannot fetch weather data');
    return;
  }
  currentDisplayCoords = coords;
  const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${coords.latitude
    }&longitude=${coords.longitude
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

    globalCoords = coords;
    globalWeatherData = weatherData;

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
      renderHourlyForecast(globalHourlyForecastsArray);
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

/* ---------- Render daily forecast (keeps existing behavior) ---------- */
const renderDailyForecast = function (weatherData) {
  if (!weatherData) return;
  const dailyContainer = document.querySelector('.forecast-grid');
  if (!dailyContainer) return;

  dailyContainer.innerHTML = '';

  if (weatherData.daily && weatherData.daily.time) {
    const dailyObj = weatherData.daily;
    const weatherCodeDaily = weatherData.daily.weather_code;

    for (let i = 0; i < dailyObj.time.length; i++) {
      const dateString = dailyObj.time[i];
      const weatherCode = weatherCodeDaily[i];
      // base Celsius values (store in data attributes)
      const baseMax = dailyObj.temperature_2m_max
        ? dailyObj.temperature_2m_max[i]
        : null;
      const baseMin = dailyObj.temperature_2m_min
        ? dailyObj.temperature_2m_min[i]
        : null;

      const displayMax =
        baseMax !== null && baseMax !== undefined
          ? isImperial
            ? Math.round(convertCelsiusToFahrenheit(baseMax))
            : Math.round(baseMax)
          : '-';
      const displayMin =
        baseMin !== null && baseMin !== undefined
          ? isImperial
            ? Math.round(convertCelsiusToFahrenheit(baseMin))
            : Math.round(baseMin)
          : '-';
      // const unit = isImperial ? '°F' : '°C';
      const dayName = getDayName(dateString);

      const { src: dailyIconSrc, alt: dailyIconAlt } = getWeatherIcon(weatherCode);
      const dailyItemHTML = `
        <div class="forecast-day-item">
          <dt>${dayName}</dt>
          <dd>
            <img src="${dailyIconSrc}" alt="${dailyIconAlt}" class="hourly-svg" aria-label="${dailyIconAlt}" />
            <div class="span-temp-container">
              <span class="high-temp" data-celsius="${baseMax !== null && baseMax !== undefined ? baseMax : ''
        }">${displayMax}°</span>
              <span class="low-temp" data-celsius="${baseMin !== null && baseMin !== undefined ? baseMin : ''
        }">${displayMin}°</span>
        
            </div>
            </dd>
            </div>
            `;
      dailyContainer.insertAdjacentHTML('beforeend', dailyItemHTML);
    }


    const sd = document.querySelector('.select-display');
    if (sd && weatherData.daily.time && weatherData.daily.time[0]) {
      const { src: dailyIconSrc, alt: dailyIconAlt } = getWeatherIcon(weatherCodeDaily);
      sd.textContent = new Date(weatherData.daily.time[0]).toLocaleDateString(
        'en-US',
        { weekday: 'long' }
      );
    }
  } else if (Array.isArray(weatherData)) {
    const grouped = {};
    weatherData.forEach(item => {
      const date = String(item.time).substring(0, 10);
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(item);
    });
    Object.keys(grouped)
      .slice(0, 7)
      .forEach(date => {
        const dayArr = grouped[date];
        const temps = dayArr
          .map(d => d.temperature)
          .filter(t => t !== null && t !== undefined);
        const baseMax = temps.length ? Math.max(...temps) : null;
        const baseMin = temps.length ? Math.min(...temps) : null;
        const displayMax =
          baseMax !== null
            ? isImperial
              ? Math.round(convertCelsiusToFahrenheit(baseMax))
              : Math.round(baseMax)
            : '-';
        const displayMin =
          baseMin !== null
            ? isImperial
              ? Math.round(convertCelsiusToFahrenheit(baseMin))
              : Math.round(baseMin)
            : '-';
        const unit = isImperial ? '°F' : '°C';
        const dayName = getDayName(date);
        const dailyItemHTML = `
        <div class="forecast-day-item">
          <dt>${dayName}</dt>
          <dd>
            <img src="${dailyIconSrc}" alt="" class="hourly-svg" aria-label="Overcast Icon" />
            <div class="span-temp-container">
              <span class="high-temp" data-celsius="${baseMax !== null ? baseMax : ''
          }">${displayMax}</span>
              <span class="low-temp" data-celsius="${baseMin !== null ? baseMin : ''
          }">${displayMin}</span>
              <span class="temp-unit-symbol">${unit}</span>
            </div>
          </dd>
        </div>
      `;
        dailyContainer.insertAdjacentHTML('beforeend', dailyItemHTML);
      });
  }
};

const showError = function (message = null, context = null) {
  // Query elements at runtime to avoid stale/undefined top-level references
  const errorSection = document.querySelector('.error-section');
  const mainContent = document.querySelector('main');
  const btn = document.querySelector('.error-btn');

  if (!errorSection) {
    console.warn('showError: .error-section not found in DOM');
    return;
  }

  // store context for retry (e.g. { coords } or { placeName })
  lastErrorContext = context || null;

  const msgEl = errorSection.querySelector('.error-message');
  if (msgEl) {
    msgEl.textContent =
      message ||
      "We couldn't connect to the server (API Error). Please try again in a few moments.";
  }

  // Hide all main content sections except error
  if (mainContent) {
    Array.from(mainContent.children).forEach(child => {
      if (
        !child.classList.contains('error-section') &&
        !child.classList.contains('weather-prompt')
      ) {
        child.style.display = 'none';
      }
    });
  }

  // reveal the error panel using the project's class name
  errorSection.classList.add('error-active');
  errorSection.setAttribute('aria-hidden', 'false');
  errorSection.setAttribute('role', 'alert');

  // ensure retry button enabled & focused for accessibility
  if (btn) {
    btn.removeAttribute('disabled');
    try {
      btn.focus({ preventScroll: true });
    } catch (_) { }
  }

  // Prevent scrolling on the body when error is shown
  document.body.style.overflow = 'hidden';
};

const hideError = function () {
  const errorSection = document.querySelector('.error-section');
  const mainContent = document.querySelector('main');

  if (!errorSection) return;

  // Hide error section
  errorSection.classList.remove('error-active');
  errorSection.setAttribute('aria-hidden', 'true');

  // Show all main content sections
  if (mainContent) {
    Array.from(mainContent.children).forEach(child => {
      if (!child.classList.contains('error-section')) {
        child.style.display = ''; // Reset to default display value
      }
    });
  }

  // Re-enable scrolling
  document.body.style.overflow = '';

  // return focus to a sensible control
  if (searchInput) {
    try {
      searchInput.focus({ preventScroll: true });
    } catch (_) { }
  } else if (document.body) {
    try {
      document.body.focus();
    } catch (_) { }
  }

  // clear stored context when error dismissed
  lastErrorContext = null;
};


// Retry handler is attached during DOMContentLoaded to ensure the DOM element exists
/* ---------- Global delegated click listeners ---------- */
document.addEventListener('click', e => {
  // header units dropdown
  const dropDownContent = document.querySelector('.dropdown-content');
  const unitButtonContainer = document.querySelector('.btn-unit');

  if (
    dropDownContent &&
    unitButtonContainer &&
    !unitButtonContainer.contains(e.target)
  ) {
    dropDownContent.classList.remove('dropdown-content-active');
  }

  // day select - close when clicked outside
  const selectDisplayEl = document.querySelector('.select-display');
  const dayListEl = document.getElementById('day-list');
  if (
    selectDisplayEl &&
    dayListEl &&
    !selectDisplayEl.contains(e.target) &&
    !dayListEl.contains(e.target)
  ) {
    selectDisplayEl.setAttribute('aria-expanded', 'false');
    dayListEl.classList.remove('select-options-list-active');
  }

  // hourly item dropdown toggle (delegated)
  const toggle = e.target.closest('.hourly-dropdown-toggle');
  if (toggle) {
    const li = toggle.closest('.forecast-item');
    if (!li) return;
    const dropdown = li.querySelector('.hourly-dropdown');
    if (!dropdown) return;
    const open = dropdown.hasAttribute('hidden')
      ? false
      : dropdown.getAttribute('aria-hidden') === 'false';
    // close other dropdowns
    document.querySelectorAll('.hourly-dropdown').forEach(d => {
      if (d !== dropdown) {
        d.setAttribute('hidden', '');
        const btn = d
          .closest('.forecast-item')
          ?.querySelector('.hourly-dropdown-toggle');
        if (btn) btn.setAttribute('aria-expanded', 'false');
      }
    });
    if (dropdown.hasAttribute('hidden')) {
      dropdown.removeAttribute('hidden');
      toggle.setAttribute('aria-expanded', 'true');
    } else {
      dropdown.setAttribute('hidden', '');
      toggle.setAttribute('aria-expanded', 'false');
    }
    e.stopPropagation();
    return;
  }
});

/* ---------- Unit / menu handlers (DOMContentLoaded) ---------- */
document.addEventListener('DOMContentLoaded', () => {

  // Ensure day select elements exist
  ensureDaySelectElements();
  const buttonContainer = document.querySelector('.btn-unit');
  
  buttonContainer.addEventListener('click', () => {
    const iconDropdown = document.querySelector('.icon-dropdown');
    if (iconDropdown) {
      iconDropdown.classList.toggle('active');
    }
  });


  // Attach retry button handler (do this here so the element exists)

  function attachRetry() {
    const retryBtn = document.querySelector('.error-btn');
    if (!retryBtn) return;

    // avoid adding multiple listeners
    retryBtn.removeEventListener &&
      retryBtn.removeEventListener('click', retryBtn._handler);

    retryBtn._handler = async function () {
      // Disable button while checking connection
      retryBtn.setAttribute('disabled', 'true');

      // First check if we're online
      if (!navigator.onLine) {
        showError(
          'No internet connection. Please check your network and try again.'
        );
        retryBtn.removeAttribute('disabled');
        return;
      }

      // Test API connectivity before proceeding
      try {
        const testResponse = await fetch(
          'https://api.open-meteo.com/v1/forecast'
        );
        if (!testResponse.ok) {
          throw new Error('API not accessible');
        }
      } catch (err) {
        showError(
          'Unable to connect to weather service. Please check your connection.'
        );
        retryBtn.removeAttribute('disabled');
        return;
      }

      // If we reach here, we have connectivity, proceed with retry
      try {
        if (lastErrorContext && lastErrorContext.placeName) {
          // Try to get coordinates for the place that failed
          try {
            const coords = await getCoordinates(lastErrorContext.placeName);
            await getAndDisplayWeather(coords);
          } catch (coordError) {
            console.error(
              'Failed to get coordinates for',
              lastErrorContext.placeName,
              coordError
            );

            // Fall back to default location (Nigeria)
            try {
              const defaultCoords = await getCoordinates('Nigeria');
              await getAndDisplayWeather(defaultCoords);
            } catch (defaultError) {
              console.error('Failed to get default coordinates:', defaultError);

              // Ultimate fallback - hardcoded coordinates for Nigeria
              const fallbackCoords = {
                latitude: 9.082,
                longitude: 8.6753,
                cityName: 'Nigeria',
                country: 'NG',
                timezone: 'Africa/Lagos',
              };
              await getAndDisplayWeather(fallbackCoords);
            }
          }
        } else if (lastErrorContext && lastErrorContext.coords) {
          // Use the coordinates from the last error
          await getAndDisplayWeather(lastErrorContext.coords);
        } else if (currentDisplayCoords) {
          // Use currently displayed coordinates
          await getAndDisplayWeather(currentDisplayCoords);
        } else {
          // No previous context, try default location
          try {
            const defaultCoords = await getCoordinates('Nigeria');
            await getAndDisplayWeather(defaultCoords);
          } catch (defaultError) {
            console.error('Failed to get default coordinates:', defaultError);

            // Ultimate fallback - hardcoded coordinates
            const fallbackCoords = {
              latitude: 9.082,
              longitude: 8.6753,
              cityName: 'Nigeria',
              country: 'NG',
              timezone: 'Africa/Lagos',
            };
            await getAndDisplayWeather(fallbackCoords);
          }
        }

        // If we got here successfully, hide the error
        hideError();
      } catch (err) {
        console.error('Retry failed:', err);
        showError(
          'Unable to load weather data. Please check your connection and try again.',
          lastErrorContext
        );
      } finally {
        // Always re-enable the button
        retryBtn.removeAttribute('disabled');
      }
    };

    retryBtn.addEventListener('click', retryBtn._handler);
  }
  attachRetry();

  // wire header unit button toggle
  const unitButtonContainer = document.querySelector('.btn-unit');
  const dropDownContent = document.querySelector('.dropdown-content');
  if (unitButtonContainer && dropDownContent) {
    unitButtonContainer.addEventListener('click', ev => {
      ev.stopPropagation();
      dropDownContent.classList.toggle('dropdown-content-active');
    });
  }

  // unit option clicks (dropdown-content .unit-option)
  const unitOptions = document.querySelectorAll(
    '.dropdown-content .unit-option'
  );
  unitOptions.forEach(option => {
    option.addEventListener('click', function () {
      const unitType = this.getAttribute('data-unit');
      // set global unit flags
      if (unitType === 'fahrenheit') {
        isImperial = true;
        currentTempUnit = 'F';
      } else if (unitType === 'celsius') {
        isImperial = false;
        currentTempUnit = 'C';
      } else if (unitType === 'mph') {
        currentWindUnit = 'mph';
      } else if (unitType === 'kmh') {
        currentWindUnit = 'kmh';
      } else if (unitType === 'inches') {
        currentPrecipUnit = 'inches';
      } else if (unitType === 'mm') {
        currentPrecipUnit = 'mm';
      }

      // show checkmark
      clearAllCheckmarks();
      const check = this.querySelector('.icon-checkmark');
      if (check) check.style.visibility = 'visible';
      updateAllUnitCheckmarks();

      // update all displayed units
      updateDisplayUnits('temperature', isImperial ? 'F' : 'C');
      updateDisplayUnits('wind', currentWindUnit === 'mph' ? 'mph' : 'kmh');
      updateDisplayUnits(
        'precipitation',
        currentPrecipUnit === 'inches' ? 'inches' : 'mm'
      );

      // update entire UI to reflect conversions
      if (globalCoords && globalWeatherData) {
        updateMainDisplay(globalCoords, globalWeatherData);
        if (globalWeatherData.hourly) {
          const dailyData = buildDailyDataFromHourly(globalWeatherData.hourly);
          const firstKey = Object.keys(dailyData)[0];
          if (firstKey) renderHourlyForecast(dailyData[firstKey]);
        }
      }
    });
  });

  // separate "switch" button if present in markup (keeps backward compatibility)
  const switchButton = document.querySelector('.switch-button');
  if (switchButton) {
    switchButton.addEventListener('click', () => {
      isImperial = !isImperial;
      updateAllUnitCheckmarks();
      if (globalCoords && globalWeatherData) {
        updateMainDisplay(globalCoords, globalWeatherData);
        if (globalWeatherData.hourly) {
          const dailyData = buildDailyDataFromHourly(globalWeatherData.hourly);
          const first = Object.keys(dailyData)[0];
          if (first) renderHourlyForecast(dailyData[first]);
        }
      }
      switchButton.textContent = isImperial
        ? 'Switch to Metric'
        : 'Switch to Imperial';
    });
  }

  // quick search handling (keeps existing behavior)
  if (searchButton && searchInput) {
    searchButton.addEventListener('click', async e => {
      e.preventDefault();
      const placeName = searchInput.value.trim();
      if (!placeName) return;
      hideError();

      const coordinates = await getCoordinates(placeName);
      if (coordinates) {
        progressBar.classList.add('progress-active');
        await getAndDisplayWeather(coordinates);
      }
      progressBar.classList.remove('progress-active');
      searchInput.value = '';
    });
  }

  // initial load: user's location first, fallback to country search if permission denied
  (async () => {
    showSkeletonLoading();
    // (no-op) ensure DOM-dependent handlers are attached in DOMContentLoaded
    if (!navigator.geolocation) {
      const defaultCoords = await getCoordinates('Nigeria');
      if (defaultCoords) await getAndDisplayWeather(defaultCoords);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async position => {
        const coords = await reverseGeocodeCoordinates(
          position.coords.latitude,
          position.coords.longitude
        );
        if (coords) {
          await getAndDisplayWeather(coords);
          hideSkeletonLoading();
        } else {
          const defaultCoords = await getCoordinates('Nigeria');
          if (defaultCoords) await getAndDisplayWeather(defaultCoords);
        }
      },
      async () => {
        const defaultCoords = await getCoordinates('Nigeria');
        if (defaultCoords) await getAndDisplayWeather(defaultCoords);
        hideSkeletonLoading();
      }
    );
  })();

  // initialize checkmarks UI
  updateAllUnitCheckmarks();
});
