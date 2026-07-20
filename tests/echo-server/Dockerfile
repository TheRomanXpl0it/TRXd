FROM golang:1.26-alpine

WORKDIR /home/chall/
COPY ./go.mod ./main.go ./
RUN go build

EXPOSE 1337

CMD [ "./echo-server" ]
