# Vacation Gallery Kubernetes Demo

This project deploys a simple frontend and backend app to local Kubernetes using Helm.

The frontend displays vacation photo cards. The backend exposes vacation metadata from `/api/vacations`.

## Local stack

- RHEL 9 VM
- Podman
- Minikube
- kubectl
- Helm

## Build images into Minikube

```bash
minikube image build -t local/vacation-backend:0.1 ./backend
minikube image build -t local/vacation-frontend:0.1 ./frontend
