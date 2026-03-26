# ISS Tracker

[Read in Portuguese](README-pt-br.md)

<p align="center">
	<img src="assets/ImagemISSTracker.png" alt="ISS Tracker preview" width="900" />
</p>

A real-time ISS tracker with a 3D globe, orbital trail, telemetry panel, and visible pass predictions. Built as a polished, immersive front-end that pulls live data and renders the ISS position on a WebGL globe.

## Features

- Live ISS position with 3D globe visualization
- Orbital trail toggle
- Telemetry readout (lat, lon, altitude, velocity)
- Visible pass predictions based on your location
- Language toggle (English / Portuguese)
- Responsive, glassmorphism-inspired UI

## Data Sources

- Open Notify (ISS position + pass predictions)
- Sunrise-Sunset (day/night window for visibility)

## Tech Stack

- HTML, CSS, JavaScript
- Three.js + Globe.gl (3D rendering)
- Google Fonts + Fontshare (typography)

## Getting Started

This is a static front-end. Any static server works.

1. Open the project folder in a local server (ex: Live Server in VS Code).
2. Allow geolocation when prompted for pass predictions.

## Notes

- Open Notify is served over HTTP. If you open the page via HTTPS, the browser may block those requests due to mixed content. Use a local HTTP server during development or proxy the requests.
- Altitude is set to a fixed value (408 km) for display.

## Project Structure

- index.html
- styles.css
- app.js
- assets/ (design references)

## License

This project is for educational and demo purposes.
