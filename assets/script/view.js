'use strict';

import {
  convertCelsiusToFahrenheit,
  getDayName,
  getWeatherIcon,
  convertKmToMph,
  convertmmToInches,
  convertHourlyDataToObjects,
} from './helpers.js';

import {
state, searchInput, countryName, cityName, dateElement
} from './state.js';

/* ---------- Render daily forecast (keeps existing behavior) ---------- */
export const renderDailyForecast = function (weatherData) {
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
          ? state.isImperial
            ? Math.round(convertCelsiusToFahrenheit(baseMax))
            : Math.round(baseMax)
          : '-';
      const displayMin =
        baseMin !== null && baseMin !== undefined
          ? state.isImperial
            ? Math.round(convertCelsiusToFahrenheit(baseMin))
            : Math.round(baseMin)
          : '-';
      // const unit = isImperial ? '°F' : '°C';
      const dayName = getDayName(dateString);

      const { src: dailyIconSrc, alt: dailyIconAlt } =
        getWeatherIcon(weatherCode);
      const dailyItemHTML = `
        <div class="forecast-day-item">
          <dt>${dayName}</dt>
          <dd>
            <img src="${dailyIconSrc}" alt="${dailyIconAlt}" class="hourly-svg" aria-label="${dailyIconAlt}" />
            <div class="span-temp-container">
              <span class="high-temp" data-celsius="${
                baseMax !== null && baseMax !== undefined ? baseMax : ''
              }">${displayMax}°</span>
              <span class="low-temp" data-celsius="${
                baseMin !== null && baseMin !== undefined ? baseMin : ''
              }">${displayMin}°</span>
        
            </div>
            </dd>
            </div>
            `;
      dailyContainer.insertAdjacentHTML('beforeend', dailyItemHTML);
    }

    const sd = document.querySelector('.select-display');
    if (sd && weatherData.daily.time && weatherData.daily.time[0]) {
      const { src: dailyIconSrc, alt: dailyIconAlt } =
        getWeatherIcon(weatherCodeDaily);
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
              <span class="high-temp" data-celsius="${
                baseMax !== null ? baseMax : ''
              }">${displayMax}</span>
              <span class="low-temp" data-celsius="${
                baseMin !== null ? baseMin : ''
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

export const updateMainDisplay = function (coords, weatherData) {
  if (!cityName || !dateElement || !countryName) {
    console.error('Missing DOM elements for main display');
    return;
  }
  if (!weatherData || !weatherData.current_weather) return;

  state.currentDisplayCoords = coords;
  state.globalCoords = coords;
  state.globalWeatherData = weatherData;

  const weatherCode = weatherData.current_weather.weathercode;

  const { src: iconSrc, alt: iconAlt } = getWeatherIcon(weatherCode);

  const mainIcon = document.querySelector('.sun-svg');
  if (mainIcon) {
    mainIcon.setAttribute('src', iconSrc);
    mainIcon.setAttribute('alt', iconAlt);
  }

  const currentTemperature = weatherData.current_weather.temperature;
  const displayTemp = state.isImperial
    ? convertCelsiusToFahrenheit(currentTemperature)
    : currentTemperature;

  const mainTempEl = document.querySelector('.temp-number');
  if (mainTempEl) {
    mainTempEl.setAttribute('data-celsius', String(currentTemperature));
    mainTempEl.textContent = `${Math.round(displayTemp)}°${
      state.isImperial ? 'F' : 'C'
    }`;
  }

  const unitSymbolEl = document.querySelector('.temp-unit-symbol');
  if (unitSymbolEl) unitSymbolEl.textContent = `°${state.isImperial ? 'F' : 'C'}`;

  // Feels like
  const feelsLikeTemp = weatherData.hourly?.apparent_temperature?.[0] ?? null;
  const feelsLikeDisplay = document.querySelector('.feels-like');
  if (feelsLikeDisplay) {
    const v =
      feelsLikeTemp !== null && state.isImperial
        ? convertCelsiusToFahrenheit(feelsLikeTemp)
        : feelsLikeTemp;
    if (v !== null && v !== undefined)
      feelsLikeDisplay.textContent = `${Math.round(v)}°${
        state.isImperial ? 'F' : 'C'
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
    windDisplay.textContent = state.isImperial
      ? `${convertKmToMph(windSpeed).toFixed(1)} mph`
      : `${windSpeed.toFixed(1)} km/h`;
  }

  // Precipitation
  const precipitationSum = weatherData.daily?.precipitation_sum?.[0] ?? 0;
  const precipitationDisplay = document.querySelector('.precipitation');
  if (precipitationDisplay) {
    precipitationDisplay.setAttribute('data-mm', String(precipitationSum));
    precipitationDisplay.textContent =
      state.currentPrecipUnit === 'inches'
        ? `${convertmmToInches(precipitationSum)} in`
        : `${precipitationSum} mm`;
  }

  // const displayCityName =
  //   coords && (coords.timezone || coords.cityName)
  //     ? coords.timezone
  //       ? coords.timezone.split('/').pop().replace(/_/g, ' ')
  //       : coords.cityName
  //     : 'Unknown';
  
  // City / country
  const displayCityName = coords.cityName || 'Unknown city'; 
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
    state.globalHourlyForecastsArray = convertHourlyDataToObjects(weatherData.hourly);
};

/* ---------- Update main summary and main display ---------- */
export const updateMainSummary = function (dailySummaryData) {
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
      const out = state.isImperial ? convertCelsiusToFahrenheit(maxTemp) : maxTemp;
      currentTempEl.textContent = state.isImperial
        ? `${Math.round(out)}°F`
        : `${Math.round(out)}°C`;
    } else {
      currentTempEl.removeAttribute('data-celsius');
      currentTempEl.textContent = '-';
    }
  }

  if (highTempEl) {
    if (maxTemp !== null && maxTemp !== undefined) {
      highTempEl.setAttribute('data-celsius', String(maxTemp));
      const out = state.isImperial ? convertCelsiusToFahrenheit(maxTemp) : maxTemp;
      highTempEl.textContent = Math.round(out);
    } else {
      highTempEl.removeAttribute('data-celsius');
      highTempEl.textContent = '-';
    }
  }

  if (lowTempEl) {
    if (minTemp !== null && minTemp !== undefined) {
      lowTempEl.setAttribute('data-celsius', String(minTemp));
      const out = state.isImperial ? convertCelsiusToFahrenheit(minTemp) : minTemp;
      lowTempEl.textContent = Math.round(out);
    } else {
      lowTempEl.removeAttribute('data-celsius');
      lowTempEl.textContent = '-';
    }
  }

  document
    .querySelectorAll('.temp-unit-symbol')
    .forEach(s => (s.textContent = `°${state.isImperial ? 'F' : 'C'}`));
};

/* ---------- Handle day selection ---------- */
export const handleDaySelection = dailyData => {
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
export const renderHourlyForecast = dayData => {
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
    const displayTempValue = state.isImperial
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
    const { src: hourlyIconSrc, alt: hourlyIconAlt } =
      getWeatherIcon(hourlyWeatherCode);

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
        <span class="temp-unit-symbol-hourly">°${state.isImperial ? 'F' : 'C'}</span>
      </div>
    `;
    hourlyListContainer.appendChild(li);
  });
};

export const populateDaySelect = dailyData => {
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

/* ---------- Populate day select (creates elements if missing) ---------- */
export const ensureDaySelectElements = function () {
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
export const clearAllCheckmarks = function () {
  const allChecks = document.querySelectorAll(
    '.dropdown-content .icon-checkmark'
  );
  allChecks.forEach(check => {
    check.style.visibility = 'hidden';
  });
};
export const updateAllUnitCheckmarks = function () {
  // show/hide checkmarks based on isImperial and current units
  const cMark = document.querySelector('[data-unit="celsius"] .icon-checkmark');
  const fMark = document.querySelector(
    '[data-unit="fahrenheit"] .icon-checkmark'
  );
  if (cMark) cMark.style.visibility = !state.isImperial ? 'visible' : 'hidden';
  if (fMark) fMark.style.visibility = state.isImperial ? 'visible' : 'hidden';

  const kmMark = document.querySelector('[data-unit="kmh"] .icon-checkmark');
  const mphMark = document.querySelector('[data-unit="mph"] .icon-checkmark');
  if (kmMark)
    kmMark.style.visibility = state.currentWindUnit === 'kmh' ? 'visible' : 'hidden';
  if (mphMark)
    mphMark.style.visibility = state.currentWindUnit === 'mph' ? 'visible' : 'hidden';

  const mmMark = document.querySelector('[data-unit="mm"] .icon-checkmark');
  const inMark = document.querySelector('[data-unit="inches"] .icon-checkmark');
  if (mmMark)
    mmMark.style.visibility = state.currentPrecipUnit === 'mm' ? 'visible' : 'hidden';
  if (inMark)
    inMark.style.visibility =
      state.currentPrecipUnit === 'inches' ? 'visible' : 'hidden';
};
export const showSkeletonLoading = function () {
  // Announce loading to screen readers
  const loadingStatus = document.getElementById('loading-status');
  if (loadingStatus) {
    loadingStatus.textContent = 'Loading weather data.......';
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
  if (hourlyForecast) hourlyForecast.style.display = 'none';
  if (footer) footer.style.display = 'none';
};

export const hideSkeletonLoading = function () {
  // Announce loading to screen readers
  const loadingStatus = document.getElementById('loading-status');
  if (loadingStatus) {
    loadingStatus.textContent = 'Weather data loaded successfully';
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
  if (hourlyForecast) hourlyForecast.style.display = 'flex';
  if (footer) footer.style.display = 'block';
};
export const updateDisplayUnits = function (type, unit) {
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
export const showError = function (message = null, context = null) {
  // Query elements at runtime to avoid stale/undefined top-level references
  const errorSection = document.querySelector('.error-section');
  const mainContent = document.querySelector('main');
  const btn = document.querySelector('.error-btn');

  if (!errorSection) {
    console.warn('showError: .error-section not found in DOM');
    return;
  }

  // store context for retry (e.g. { coords } or { placeName })
  state.lastErrorContext = context || null;

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
    } catch (_) {}
  }

  // Prevent scrolling on the body when error is shown
  document.body.style.overflow = 'hidden';
};

export const hideError = function () {
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
    } catch (_) {}
  } else if (document.body) {
    try {
      document.body.focus();
    } catch (_) {}
  }

  // clear stored context when error dismissed
  state.lastErrorContext = null;
};
