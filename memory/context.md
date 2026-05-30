# Management Dashboard - Context & Memory

## Project Overview
This is a React (Vite + TypeScript + Ant Design) application designed as the administrative and seller dashboard for the B2B Procurement platform.
The backend is a Spring Boot application running on `localhost:8080`.

## Architecture & Tech Stack
- **Frontend**: React, Vite, TypeScript, React Router, Ant Design (standard components, no custom brutalist themes).
- **Backend**: Spring Boot, Java 21, MongoDB (`procurement-service`).
- **Proxy**: Vite proxies `/api` to `localhost:8080`.

## Current State
- **Phase 1 (Brands & Categories)**: Rebuilt functionally using standard Ant Design `Table` and `Tree` components. S3 image upload is working via `uploadService.ts`.
- **Layout**: Mobile responsiveness fixed. The sidebar correctly uses an Ant Design `Drawer` on mobile viewports.
- **Auth**: Fully functional. The login form uses `username` instead of `mobileNumber`. CORS has been fixed in `application.properties` to allow `http://localhost:5174`.
- **Credentials**: `modibrothers` / `modi@1234` for Seller, `admin` / `admin@1234` for Admin.

## Active Phase
All MVP and Post-MVP Phases, including User Management and Security Hardening, are fully complete, verified, and secured!
