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
  state, searchInput, countryName, cityName, city, dateElement
} from './state.js';

/* ---------- Render daily forecast (keeps existing behavior) ---------- */
export const renderDailyForecast = function (weatherData) {

  // Safety check
  if (!weatherData) return;
  const dailyContainer = document.querySelector('.forecast-grid');
  if (!dailyContainer) return;
  // ///////////////////////////////

  // Empties the container before any other thing. 
  dailyContainer.innerHTML = '';
  //////////////////////////////////////////////

  // If weatherData.daily and weatherData.daily.time exists.
  if (weatherData.daily && weatherData.daily.time) {
    const dailyObj = weatherData.daily;
    const weatherCodeDaily = weatherData.daily.weather_code;

    for (let i = 0; i < dailyObj.time.length; i++) {
      // Extracts the weather property at the current index/position.
      const dateString = dailyObj.time[i];
      const weatherCode = weatherCodeDaily[i];

      // Base Celsius values (store in data attributes). If dailyObj.temperature_2m_max exists, 
      // then baseMax(high temp) will be dailyObj.temperature_2m_max at the current position or null.
      const baseMax = dailyObj.temperature_2m_max
        ? dailyObj.temperature_2m_max[i]
        : null;
      //  If dailyObj.temperature_2m_min exists, 
      // then baseMin(low temp) will be dailyObj.temperature_2m_min at the current position or null.
      const baseMin = dailyObj.temperature_2m_min
        ? dailyObj.temperature_2m_min[i]
        : null;

      // Checks if baxemax is valid(not null or undefined), 
      // checks the state of the isImperial, if it is imperial, it converts the basemax to fahrenheit, 
      // if isImperial is metric, it just rounds the basemax.
      const displayMax =
        baseMax !== null && baseMax !== undefined
          ? state.currentTempUnit === 'F'
            ? Math.round(convertCelsiusToFahrenheit(baseMax))
            : Math.round(baseMax)
          : '-';

      // Checks if baxemin is valid(not null or undefined).
      //  checks the state of the isImperial, if it is imperial, it converts the basemin to fahrenheit, 
      // if isImperial is metric, it just rounds the basemin.
      const displayMin =
        baseMin !== null && baseMin !== undefined
          ? state.currentTempUnit === 'F'
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
                <span class="high-temp" data-celsius="${baseMax !== null && baseMax !== undefined ? baseMax : ''
              }">${displayMax}<span class="temp-unit-symbol">°${state.currentTempUnit}</span></span>
                <span class="low-temp" data-celsius="${baseMin !== null && baseMin !== undefined ? baseMin : ''
              }">${displayMin}<span class="temp-unit-symbol">°${state.currentTempUnit}</span></span>
        
            </div>
            </dd>
            </div>
            `;
      dailyContainer.insertAdjacentHTML('beforeend', dailyItemHTML);
    }

    const sd = document.querySelector('.select-display');
    if (sd && weatherData.daily.time && weatherData.daily.time[0]) {

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
            ? state.currentTempUnit === 'F'
              ? Math.round(convertCelsiusToFahrenheit(baseMin))
              : Math.round(baseMin)
            : '-';
        const unit = state.currentTempUnit === 'F' ? '°F' : '°C';
        const dayName = getDayName(date);

        const dailyItemHTML = `
        <div class="forecast-day-item">
          <dt>${dayName}</dt>
          <dd>
            <img src="${dailyIconSrc}" alt="${dailyIconAlt}" class="hourly-svg" aria-label="${dailyIconAlt}" />
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

// This is the function that updates the UI/main display.
export const updateMainDisplay = function (coords, weatherData) {
  if (!cityName || !dateElement || !countryName || !city) {
    console.error('Missing DOM elements for main display');
    return;
  }

  if (!weatherData || !weatherData.current_weather) return;

  state.currentDisplayCoords = coords;
  state.globalCoords = coords;
  state.globalWeatherData = weatherData;

  // Gets the weather code of the current weather.
  const weatherCode = weatherData.current_weather.weathercode;
  // Using destructuring to assign values the iconSrc and iconAlt variables.
  const { src: iconSrc, alt: iconAlt } = getWeatherIcon(weatherCode);

  const mainIcon = document.querySelector('.sun-svg');
  if (mainIcon) {
    mainIcon.setAttribute('src', iconSrc);
    mainIcon.setAttribute('alt', iconAlt);
  }

  // Checks the state of the isImperial and updates the UI accordingly.
  // If isImperial/switch button is switched to metric, the values should be converted to fahrenheit else, the normal figures should be displayed.
  const currentTemperature = weatherData.current_weather.temperature;
  // Use the user's selected temperature unit (may be independent from isImperial)
  const displayTemp = state.currentTempUnit === 'F'
    ? convertCelsiusToFahrenheit(currentTemperature)
    : currentTemperature;

  const mainTempEl = document.querySelector('.temp-number');
  if (mainTempEl) {
    mainTempEl.setAttribute('data-celsius', String(currentTemperature));
    mainTempEl.textContent = `${Math.round(displayTemp)}°${state.currentTempUnit}`;
  }

  const unitSymbolEl = document.querySelector('.temp-unit-symbol');
  if (unitSymbolEl) unitSymbolEl.textContent = `°${state.currentTempUnit}`;

  // Feels like
  const feelsLikeTemp = weatherData.hourly?.apparent_temperature?.[0] ?? null;
  const feelsLikeDisplay = document.querySelector('.feels-like');
  if (feelsLikeDisplay) {
    const v = feelsLikeTemp !== null && state.currentTempUnit === 'F'
      ? convertCelsiusToFahrenheit(feelsLikeTemp)
      : feelsLikeTemp;
    if (v !== null && v !== undefined)
      feelsLikeDisplay.textContent = `${Math.round(v)}°${state.currentTempUnit}`;
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

    // Respect the user's selected wind unit (separate from the global isImperial flag)
    const windUnit = state.currentWindUnit === 'mph' ? 'mph' : 'kmh';
    windDisplay.textContent =
      windUnit === 'mph'
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


  // City / Country
  const displayCityName = coords.cityName || 'Unknown city';
  cityName.textContent = displayCityName + ', ';

  countryName.textContent = coords?.country || '';
  city.textContent = (coords?.city ? coords.city + ', ' : ' ') || '';
  cityName.appendChild(city)
  cityName.appendChild(countryName);

  const now = new Date();
  const options = {
    weekday: 'long',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };

// Checks if weatherdata exists and if weatherData.timezone exists and if weatherData.timezone isequqlas to auto'
// If yes, it should be asssgined to the timezone of options else coords.timezone after passing the test should be assigned to options.timezone.
if (weatherData && weatherData.timezone && weatherData.timezone === 'auto') {
  options.timezone = weatherData.timezone;
} else if (coords && coords.timezone && coords.timezone === 'auto') {
  options.timezone = coords.timezone;
}
  const formattedDate = now.toLocaleDateString('en-US', options);

  if (dateElement) {
    dateElement.textContent = formattedDate;
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

  // Store base Celsius in data attributes so updateDisplayUnits can convert.
  // Checks if maxTemp and minTemp are valid(not null/undefined), the it sets an attribute on the HTML element for easy access and conversion
  // It then checks the state of the isImperial/switch button. If it is switched to Imperial, 
  // the value should be converted to fahrenheit else it should just be displayed.
  if (currentTempEl) {
    if (maxTemp !== null && maxTemp !== undefined) {
      currentTempEl.setAttribute('data-celsius', String(maxTemp));
      const out = state.currentTempUnit === 'F' ? convertCelsiusToFahrenheit(maxTemp) : maxTemp;
      currentTempEl.textContent = `${Math.round(out)}°${state.currentTempUnit}`;
    } else {
      currentTempEl.removeAttribute('data-celsius');
      currentTempEl.textContent = '-';
    }
  }

  if (highTempEl) {
    if (maxTemp !== null && maxTemp !== undefined) {
      highTempEl.setAttribute('data-celsius', String(maxTemp));
      const out = state.currentTempUnit === 'F' ? convertCelsiusToFahrenheit(maxTemp) : maxTemp;
      highTempEl.innerHTML = `${Math.round(out)}<span class="temp-unit-symbol">°${state.currentTempUnit}</span>`;
    } else {
      highTempEl.removeAttribute('data-celsius');
      highTempEl.textContent = '-';
    }
  }

  if (lowTempEl) {
    if (minTemp !== null && minTemp !== undefined) {
      lowTempEl.setAttribute('data-celsius', String(minTemp));
      const out = state.currentTempUnit === 'F' ? convertCelsiusToFahrenheit(minTemp) : minTemp;
      lowTempEl.innerHTML = `${Math.round(out)}<span class="temp-unit-symbol">°${state.currentTempUnit}</span>`;
    } else {
      lowTempEl.removeAttribute('data-celsius');
      lowTempEl.textContent = '-';
    }
  }

  document
    .querySelectorAll('.temp-unit-symbol')
    .forEach(s => (s.textContent = `°${state.currentTempUnit}`));
};

/* ---------- Handle day selection ---------- */
export const handleDaySelection = dailyData => {
  ensureDaySelectElements();
  const dl = document.getElementById('day-list');
  const sd = document.querySelector('.select-display');
  if (!dl || !sd || !dailyData) return;

  // Delegate clicks on day list. This ensures that c click event is only 
  // processed when a valid list item is clicked and then prevents the event from
  //  affecting higher-level elements in the document.
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
    const formattedSelectedDate = selectedDate.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    });
    dateElement.textContent = formattedSelectedDate;

    // compute max/min from that day's hourly temps (normalize)
    const temps = dayArray
      .map(hour => (hour.temperature && hour.weathercode !== undefined ? hour.temperature : null))
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

  // Toggle open/close
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


  // Get the next 8 hours from current hour. It starts at 0(startIndex) and ends at 8 which is 0(startIndex) + 8 (HOURS_TO_DISPLAY).
  const startIndex = currentIndex >= 0 ? currentIndex : 0;
  const nextEightHours = dayData.slice(
    startIndex,
    startIndex + HOURS_TO_DISPLAY
  );
  nextEightHours.forEach(forecast => {
    // If forecast.temperature is valid(not undefined and null), tempCelsius should be assigned forecast.temperature else 0;
    const tempCelsius =
      forecast.temperature !== undefined && forecast.temperature !== null
        ? forecast.temperature
        : 0;
    // Checks for the state of the switch button/isImperial. If it is switched to metric, 
    // the value should be converted to fahrenheit else the value should be displayed.
    const displayTempValue = state.currentTempUnit === 'F'
      ? convertCelsiusToFahrenheit(tempCelsius)
      : tempCelsius;
    const roundedValue = Math.round(displayTempValue);
    // This converts the forecast.time to a string (2025-12-05T15:00) and substring(11. 16) extracts 15:00
    const timeString =
      String(forecast.time).substring(11, 16) || String(forecast.time);
    const hour24 = parseInt(timeString.split(':')[0], 10) || 0;
    const ampm = hour24 >= 12 ? 'PM' : 'AM';
    const hour12 = hour24 % 12 || 12;
    const displayTime = `${hour12} ${ampm}`;

    // Assigns the corresponding weather icon using the weaher code retrieved.
    const hourlyWeatherCode = forecast.weathercode;
    const { src: hourlyIconSrc, alt: hourlyIconAlt } =
      getWeatherIcon(hourlyWeatherCode);

    // Include a small dropdown toggle per hourly item (delegated handler will manage it)
    const li = document.createElement('li');
    li.className = 'forecast-item';

    li.innerHTML = `
      <div class="temp-time">
        <img src="${hourlyIconSrc}" alt="${hourlyIconAlt}" class="icon-overcast hourly-forecast-svg" aria-label="${hourlyIconAlt}" />
        <span class="time">${displayTime}</span>
      </div>
      <div class="temp-block">
        <span class="temp-number-hourly" data-celsius="${tempCelsius}">${roundedValue}</span>
        <span class="temp-unit-symbol-hourly">°${state.currentTempUnit}</span>
      </div>
    `;
    hourlyListContainer.appendChild(li);
  });
};

// This function dynamically adds the hourly forecast section.
export const populateDaySelect = dailyData => {

  ensureDaySelectElements();
  const dayList = document.getElementById('day-list');
  const selectDisplay = document.querySelector('.select-display');
  if (!dayList || !selectDisplay || !dailyData) return;

  // The keys are 2025-12-05 from the dailyData(they're on the left hand side).
  const dayKeys = Object.keys(dailyData);

  // //////////////////////
  // Checks if the dayKeys are valid and not empty or zero.
  if (dayKeys.length === 0) {
    dayList.innerHTML = '';
    selectDisplay.textContent = 'Today';
    return;
  }
  /////////////////////////////////

  dayList.innerHTML = '';

  // This extracts the time value of the very first data point(the first hour of the first day)
  // from the entire dailyData structure. The first time of each day starts at 00:00, so that is what dailyData[dayKeys[0]][0] 
  // accesses and then getDayName converts it to a real day, then the weather imformation of each day starts at 12AM(00:00).
  const firstDayTime = dailyData[dayKeys[0]][0]?.time;
  const firstDayName = getDayName(firstDayTime, true);
  selectDisplay.textContent = firstDayName;
  const img = document.createElement('img');
  img.src = '/assets/images/icon-dropdown.svg';
  img.className = 'dropdown-icon';
  img.alt = 'Drop down Icon'
  selectDisplay.appendChild(img);

  dayKeys.forEach((datekey, index) => {

    // If dailyData and the datekey at the first position exists, 
    // the time should be extracted and be assigned to dayTime.
    const dayTime = dailyData[datekey][0]?.time || datekey;
    // /////////////////////////

    // This helps to convert the value stored in dayTime to a real day name and also in full.
    const dayNameFull = getDayName(dayTime, true);
    // //////////////////////
  

    // At the first position, a list element should be created and assigned the id "selected-day" to it.
    const isSelected = index === 0;
    const li = document.createElement('li');
    li.className = 'custom-option-selected';
    if (isSelected) {
      li.id = 'selected-day';
    }
    // //////////////////////////////////////

    li.setAttribute('role', 'option');
    li.setAttribute('aria-selected', String(isSelected));
    li.setAttribute('data-value', datekey);
    li.setAttribute('aria-labelledby', dayNameFull.toLowerCase());

    // The list element should have a textcontent of the day's full name that we created earlier on (const dayNameFull = getDayName(dayTime, true);
    li.textContent = dayNameFull;
    // //////////////////////////

    // Now append the newly created list to its parent container.
    dayList.appendChild(li);
    // ////////////////////////////////
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
    const img = document.createElement('img');
    img.src = '/assets/images/icon-dropdown.svg';
    btn.appendChild(img)
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

// This function clears the icon-checkmark where and when necessary.
export const clearAllCheckmarks = function () {
  // Focuses on the dropdown content and not the select display.
  const allChecks = document.querySelectorAll(
    '.dropdown-content .icon-checkmark'
  );
  allChecks.forEach(check => {
    check.style.visibility = 'hidden';
  });
};

  // Show/hide checkmarks based on isImperial and current units.
export const updateAllUnitCheckmarks = function () {

  const cMark = document.querySelector('[data-unit="celsius"] .icon-checkmark');
  const fMark = document.querySelector('[data-unit="fahrenheit"] .icon-checkmark');

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
      const rounded = Math.round(out);

      // Simple and robust: set innerHTML to numeric value + unit span
      el.innerHTML = `${rounded}<span class="temp-unit-symbol">°${unit}</span>`;
    });

    // Also update hourly unit symbols if present
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

    document
      .querySelectorAll('.temp-unit-symbol')
      .forEach(s => (s.textContent = `°${unit}`));
    document
      .querySelectorAll('.temp-unit-symbol-hourly')
      .forEach(s => (s.textContent = `°${unit}`));
};

export const showError = function (message = null, context = null) {
  // Query elements at runtime to avoid stale/undefined top-level references
  const errorSection = document.querySelector('.error-section');
  const mainContent = document.querySelector('main');
  const btn = document.querySelector('.error-btn');

  // Safety check. If .error-section is missing from the DOM, it should return(stop execution).
  if (!errorSection) {
    console.warn('showError: .error-section not found in DOM');
    return;
  }
// //////////////////////////////////////////////

  // Store context for retry (e.g. { coords } or { placeName })
  state.lastErrorContext = context || null;

  // This gets the error message in the DOM and sets the error message to a 
  // customised error message by any function calling it or the default error message in the DOM.
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

  // Reveal the error panel using the project's class name
  errorSection.classList.add('error-active');
  errorSection.setAttribute('aria-hidden', 'false');
  errorSection.setAttribute('role', 'alert');

  // Ensure retry button enabled & focused for accessibility
  if (btn) {
    btn.removeAttribute('disabled');
    try {
      btn.focus({ preventScroll: true });
    } catch (_) { }
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

  // Return focus to a sensible control
  if (searchInput) {
    try {
      searchInput.focus({ preventScroll: true });
    } catch (_) { }
  } else if (document.body) {
    try {
      document.body.focus();
    } catch (_) { }
  }

  // Clear stored context when error dismissed
  state.lastErrorContext = null;
};
