FROM node:24-alpine AS frontend

WORKDIR /app
COPY ./frontend/package*.json ./
RUN npm ci
COPY ./frontend ./
ARG GIT_HASH=unknown
ENV VITE_GIT_HASH=${GIT_HASH}
RUN npm run build


FROM golang:1.26-alpine AS backend

WORKDIR /app
COPY ./backend/go.mod ./backend/go.sum ./
RUN go mod download

COPY ./backend/ .

RUN go build .


FROM alpine:3.24

RUN addgroup -S app && adduser -S -G app app

WORKDIR /app

COPY --from=frontend /app/build ./frontend

COPY --from=backend /app/trxd ./trxd
COPY --from=backend /app/static ./static
COPY --from=backend /app/sql ./sql

RUN chown -R app:app /app

USER app

EXPOSE 1337

CMD ["/app/trxd"]
