# Architecture Overview

## System Summary

AI-Edits is a multi-component system that enables users to edit videos using natural language prompts.
The system translates prompts into structured edit plans and executes them through a rendering pipeline.

The architecture is designed to be modular, allowing independent development of frontend, backend, and model components.


## High-Level Flow

1. User submits a prompt and video to edit through the frontend
2. Frontend sends the request to the backend API
3. Backend processes the request and calls the pipeline module
4. Master model generates a structured edit plan
5. Passing the plan to the rendering/execution layer
6. Final edited video or result is returned to the user

## Git Layout
The main branch will be protected, and members will make a branch with the name of the feature they are working plus their intials. Each member will work on a given step of this flow.
For example if Praneet Popuri is working on the master model he would create master-model-pp branch.

