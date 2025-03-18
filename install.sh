#!/bin/bash

cd backend
go mod tidy
cd ..

cd frontend
npm install
cd ..

