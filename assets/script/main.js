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

import { getAndDisplayWeather, buildDailyDataFromHourly, reverseGeocodeCoordinates, getCoordinates } from './logic.js';
import { state, searchButton, searchInput, progressBar, errorBtn, iconRetry, iconLoading, sections } from './state.js'



// Functions to reveal Elements on scroll.
const revealSection = function (entries, observer) {
  const [entry] = entries;
  if (!entry.isIntersecting) return;
  entry.target.classList.remove('section-hidden');
  observer.unobserve(entry.target);
};
const sectionObserver = new IntersectionObserver(revealSection, {
  root: null,
  threshold: 0.1,
});
sections.forEach(function (section) {
  sectionObserver.observe(section);
  section.classList.add('section-hidden');
});
// ////////////////////////////////////////////////////


// Functions to make the retry and loading svgs to rotate 360deg.
const startSpinner = () => {
  iconRetry.classList.add('is-loading');
  iconLoading.classList.add('is-loading');
  errorBtn.disabled = true;
};


const stopSpinner = () => {
  iconRetry.classList.remove('is-loading');
  iconLoading.classList.remove('is-loading');
  errorBtn.disabled = false;
};
/////////////////////////////////////////////////////////////



// Retry handler is attached during DOMContentLoaded to ensure the DOM element exists
/* ---------- Global delegated click listeners ---------- */
document.addEventListener('click', e => {

  // Header units dropdown. If dropDownContent and unitButtonContainer exists and a click happens on an area other 
  // than the dropDownContent and unitButtonContainer, the dropDownContent should be hidden.
  const dropDownContent = document.querySelector('.dropdown-content');
  const unitButtonContainer = document.querySelector('.btn-unit');

  if (
    dropDownContent &&
    unitButtonContainer &&
    !unitButtonContainer.contains(e.target)
  ) {
    dropDownContent.classList.remove('dropdown-content-active');
  }
  // ///////////////////////////////////////////////

  // Day select (close when clicked outside). If selectDisplay and dayList exists and a click happens on an 
  // area other than the selectDisplay and dayList, the dropdown should be hidden.
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
  // ///////////////////////////////////////////////

});

/* ---------- Unit / menu handlers (DOMContentLoaded) ---------- */
document.addEventListener('DOMContentLoaded', () => {

  // Ensure day select elements exist.
  ensureDaySelectElements();


  // Event listener on the .btn-unit, to rotate the icon dropdown by toggling the active class.
  const buttonContainer = document.querySelector('.btn-unit');
  buttonContainer.addEventListener('click', () => {
    const iconDropdown = document.querySelector('.icon-dropdown');
    if (iconDropdown) {
      iconDropdown.classList.toggle('active');
    }
  });

  const customWrapper = document.querySelector('.custom-select-wrapper');
  customWrapper.addEventListener('click', () => {
    const iconDropdown = document.querySelector('.dropdown-icon');
    if (iconDropdown) {
      iconDropdown.classList.toggle('active');
    }
  });
  // /////////////////////////////////////////////////////////////////////////

  // Attach retry button handler (do this here so the element exists)

  function attachRetry() {
    const retryBtn = document.querySelector('.error-btn');
    if (!retryBtn) return;

    // Prevent/avoid adding multiple listeners.
    retryBtn.removeEventListener &&
      retryBtn.removeEventListener('click', retryBtn._handler);

    // The underscore signals that the property is private and should not be accessed by external code. 
    // It assigns an async function to the _handler property.
    retryBtn._handler = async function () {
      startSpinner();

      // Disable button while checking connection
      retryBtn.setAttribute('disabled', 'true');

      // First check if we're online(if there is an active internet connection).
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
              const defaultCoords = await getCoordinates();
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
        stopSpinner();
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

  // Wire header unit button toggle. This sets up the toggle behaviour for the unit button.
  const unitButtonContainer = document.querySelector('.btn-unit');
  const dropDownContent = document.querySelector('.dropdown-content');
  if (unitButtonContainer && dropDownContent) {
    unitButtonContainer.addEventListener('click', ev => {
      ev.stopPropagation();
      dropDownContent.classList.toggle('dropdown-content-active');
    });
  }
  // ////////////////////////////////////////////////


  // Unit options: click + keyboard behavior (radio semantics)
  const unitOptions = document.querySelectorAll('.dropdown-content .unit-option');

  const selectUnitOption =   function (option) {
    // Gets the corresponding attribute from the DOM.
    const unitType = option.getAttribute('data-unit');

    // Set global unit flags
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

    // Update ARIA and tabindex within this radiogroup
    const group = option.closest('[role="radiogroup"]') || option.parentElement;
    // Selects all the divs with classname .unit-option from any div with the radiogroup role 
    // and stores it in the options variable.
    const options = Array.from(group.querySelectorAll('.unit-option'));
    // Loops over all of them
    options.forEach(o => {
      const selected = o === option;
      // What this basically does is to update the aria-checked. If any of the .unit-option is clicked on,
      // it updates it to true or false. This is for accessibility.
      o.setAttribute('aria-checked', selected ? 'true' : 'false');
      // When a click happens on any of the .unit-option, it updates the tabindex with either 0 or -1
      o.setAttribute('tabindex', selected ? '0' : '-1');
    });

    // Visual checkmark sync & accessibility
    clearAllCheckmarks();
    const check = option.querySelector('.icon-checkmark');
    if (check) check.style.visibility = 'visible';
    updateAllUnitCheckmarks();

    // Update displayed units using the canonical, official, and standard state keys.
    // After making selections on the dropdown content, we  need to call the updateDisplayUnits function. Depending on the type of unit,
    // the corresponding global variable should be updated
    updateDisplayUnits('temperature', state.currentTempUnit);
    updateDisplayUnits('wind', state.currentWindUnit === 'mph' ? 'mph' : 'kmh');
    updateDisplayUnits('precipitation', state.currentPrecipUnit === 'inches' ? 'inches' : 'mm');

    // Re-render main UI if we already have weather data
    if (state.globalCoords && state.globalWeatherData) {
      updateMainDisplay(state.globalCoords, state.globalWeatherData);
      if (state.globalWeatherData.hourly) {
        const dailyData = buildDailyDataFromHourly(state.globalWeatherData.hourly);
        const firstKey = Object.keys(dailyData)[0];
        if (firstKey) renderHourlyForecast(dailyData[firstKey]);
      }
    }
  }

  unitOptions.forEach(option => {
    // Ensure ARIA role + initial tabindex are present
    option.setAttribute('role', 'radio');
    option.setAttribute('tabindex', option.getAttribute('aria-checked') === 'true' ? '0' : '-1');

    // Click selects the option
    option.addEventListener('click', e => {
      e.preventDefault();
      selectUnitOption(option);
      option.focus();
    });

    // Keyboard support: Enter/Space to activate, Arrows/Home/End to navigate
    option.addEventListener('keydown', e => {
      const key = e.key;
      const group = option.closest('[role="radiogroup"]') || option.parentElement;
      const options = Array.from(group.querySelectorAll('.unit-option'));
      const idx = options.indexOf(option);

      if (key === 'Enter' || key === ' ') {
        e.preventDefault();
        selectUnitOption(option);
        return;
      }

      if (key === 'ArrowRight' || key === 'ArrowDown') {
        e.preventDefault();
        const next = options[(idx + 1) % options.length];
        next.focus();
        selectUnitOption(next);
        return;
      }

      if (key === 'ArrowLeft' || key === 'ArrowUp') {
        e.preventDefault();
        const prev = options[(idx - 1 + options.length) % options.length];
        prev.focus();
        selectUnitOption(prev);
        return;
      }

      if (key === 'Home') {
        e.preventDefault();
        const first = options[0];
        first.focus();
        selectUnitOption(first);
        return;
      }

      if (key === 'End') {
        e.preventDefault();
        const last = options[options.length - 1];
        last.focus();
        selectUnitOption(last);
        return;
      }
    });
  });

  // Separate "switch" button if present in markup (keeps backward compatibility)
  const switchButton = document.querySelector('.switch-button');
  if (switchButton) {
    switchButton.addEventListener('click', () => {
      state.isImperial = !state.isImperial;
      // When switching system, also set the current unit selections to the corresponding values
      state.currentTempUnit = state.isImperial ? 'F' : 'C';
      state.currentWindUnit = state.isImperial ? 'mph' : 'kmh';
      state.currentPrecipUnit = state.isImperial ? 'inches' : 'mm';

      updateAllUnitCheckmarks();
      if (state.globalCoords && state.globalWeatherData) {
        // Update displayed units first so updateMainDisplay uses the correct unit state
        updateDisplayUnits('temperature', state.currentTempUnit);
        updateDisplayUnits('wind', state.currentWindUnit === 'mph' ? 'mph' : 'kmh');
        updateDisplayUnits('precipitation', state.currentPrecipUnit === 'inches' ? 'inches' : 'mm');

        updateMainDisplay(state.globalCoords, state.globalWeatherData);
        if (state.globalWeatherData.hourly) {
          const dailyData = buildDailyDataFromHourly(state.globalWeatherData.hourly);
          const first = Object.keys(dailyData)[0];
          if (first) renderHourlyForecast(dailyData[first]);
        }
      }
      // This switches the textcontext of the switch button. 
      // If it is showing "Switch to Imperial", then it should change to "switxh to Metric" when a click event happens.
      switchButton.textContent = state.isImperial
        ? 'Switch to Metric'
        : 'Switch to Imperial';
    });
  }

  // Quick search handling (keeps existing behavior). This searches for cities.
  if (searchButton && searchInput) {
    searchButton.addEventListener('click', async e => {
      e.preventDefault();
      const placeName = searchInput.value.trim();
      if (!placeName) return;
      hideError();

      const coordinates = await getCoordinates(placeName);
      if (coordinates) {
        progressBar.classList.add('progress-active');
        startSpinner();
        await getAndDisplayWeather(coordinates);
      }
      progressBar.classList.remove('progress-active');
      stopSpinner();
      searchInput.value = '';
    });
  }

  // initial load: user's location first, fallback to country search if permission denied
  (async () => {
    showSkeletonLoading();

    // (no-op) Ensure DOM-dependent handlers are attached in DOMContentLoaded.
    // If the location of the user is unavilable, it should fall back to using Nigeria as the default location.
    if (!navigator.geolocation) {
      const defaultCoords = await getCoordinates('Nigeria');
      if (defaultCoords) await getAndDisplayWeather(defaultCoords);
      return;
    }

    // This gets the user's location weather information on load.
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
