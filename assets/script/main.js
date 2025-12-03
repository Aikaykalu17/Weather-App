'use strict';

import {
  ensureDaySelectElements,
  showError,
  hideError,
  showSkeletonLoading,
  hideSkeletonLoading,
  updateAllUnitCheckmarks,
  updateMainDisplay,
  updateDisplayUnits,
  renderHourlyForecast,
  clearAllCheckmarks,

} from './view.js'

import { getAndDisplayWeather,buildDailyDataFromHourly,reverseGeocodeCoordinates, getCoordinates } from './logic.js';
import {state, searchButton, searchInput, progressBar} from './state.js'

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
        if (state.lastErrorContext && state.lastErrorContext.placeName) {
          // Try to get coordinates for the place that failed
          try {
            const coords = await getCoordinates(lastErrorContext.placeName);
            await getAndDisplayWeather(coords);
          } catch (coordError) {
            console.error(
              'Failed to get coordinates for',
              state.lastErrorContext.placeName,
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
        } else if (state.lastErrorContext && state.lastErrorContext.coords) {
          // Use the coordinates from the last error
          await getAndDisplayWeather(state.lastErrorContext.coords);
        } else if (state.currentDisplayCoords) {
          // Use currently displayed coordinates
          await getAndDisplayWeather(state.currentDisplayCoords);
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
          state.lastErrorContext
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
        state.isImperial = true;
        state.currentTempUnit = 'F';
      } else if (unitType === 'celsius') {
        state.isImperial = false;
        state.currentTempUnit = 'C';
      } else if (unitType === 'mph') {
        state.currentWindUnit = 'mph';
      } else if (unitType === 'kmh') {
        state.currentWindUnit = 'kmh';
      } else if (unitType === 'inches') {
        state.currentPrecipUnit = 'inches';
      } else if (unitType === 'mm') {
        state.currentPrecipUnit = 'mm';
      }

      // show checkmark
      clearAllCheckmarks();
      const check = this.querySelector('.icon-checkmark');
      if (check) check.style.visibility = 'visible';
      updateAllUnitCheckmarks();

      // update all displayed units
      updateDisplayUnits('temperature', state.isImperial ? 'F' : 'C');
      updateDisplayUnits('wind', state.currentWindUnit === 'mph' ? 'mph' : 'kmh');
      updateDisplayUnits(
        'precipitation',
        state.currentPrecipUnit === 'inches' ? 'inches' : 'mm'
      );

      // update entire UI to reflect conversions
      if (state.globalCoords && state.globalWeatherData) {
        updateMainDisplay(state.globalCoords, state.globalWeatherData);
        if (state.globalWeatherData.hourly) {
          const dailyData = buildDailyDataFromHourly(state.globalWeatherData.hourly);
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
      state.isImperial = !state.isImperial;
      updateAllUnitCheckmarks();
      if (state.globalCoords && state.globalWeatherData) {
        updateMainDisplay(state.globalCoords, state.globalWeatherData);
        if (state.globalWeatherData.hourly) {
          const dailyData = buildDailyDataFromHourly(state.globalWeatherData.hourly);
          const first = Object.keys(dailyData)[0];
          if (first) renderHourlyForecast(dailyData[first]);
        }
      }
      switchButton.textContent = state.isImperial
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
