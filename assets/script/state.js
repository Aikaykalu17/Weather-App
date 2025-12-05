'use strict';

export const state = {
    isImperial: false,
    currentDisplayCoords: null,
    globalCoords: null,
    globalWeatherData: null,
    currentTempUnit: 'C',
    currentWindUnit: 'kmh',
    currentPrecipUnit: 'mm',
    currentDayOffset: 0,
    globalHourlyForecastsArray: [],
    lastErrorContext: null,
};

export const main = document.querySelector('main');
export const errorSection = document.querySelector('.error-section');
export const errorBtn = document.querySelector('.error-btn');
export const iconRetry = document.querySelector('.icon-retry');
export const iconLoading = document.querySelector('.icon-loading'); 

export const dayListContainer = document.getElementById('day-list');
export const selectDisplay = document.querySelector('.select-display');
export const cityName = document.querySelector('.city-name');
export const dateElement = document.querySelector('.weather-date');
export const tempNumber = document.querySelector('.temp-number');
export const weatherIcon = document.querySelector('.sun-svg');
export const countryName = document.querySelector('.country-name');
export const city = document.querySelector('.city'); 
export const searchButton = document.querySelector('.search-btn');
export const searchInput = document.querySelector('.search-place');
export const progressBar = document.querySelector('.progress-bar');
export const sections = document.querySelectorAll('.section');

export const celsiusButton = document.querySelector('[data-unit="celsius"]');
export const fahrenheitButton = document.querySelector('[data-unit="fahrenheit"]');
export const kmhButton = document.querySelector('[data-unit="kmh"]');
export const mphButton = document.querySelector('[data-unit="mph"]');
export const mmButton = document.querySelector('[data-unit="mm"]');
export const inchesButton = document.querySelector('[data-unit="inches"]');