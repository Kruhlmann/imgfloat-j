.ONESHELL:
.POSIX:

.DEFAULT_GOAL := build

IMGFLOAT_ASSETS_PATH ?= ./assets
IMGFLOAT_PREVIEWS_PATH ?= ./previews
SPRING_SERVLET_MULTIPART_MAX_FILE_SIZE ?= 10MB
RUNTIME_ENV = IMGFLOAT_ASSETS_PATH=$(IMGFLOAT_ASSETS_PATH) \
			  IMGFLOAT_PREVIEWS_PATH=$(IMGFLOAT_PREVIEWS_PATH) \
			  SPRING_SERVLET_MULTIPART_MAX_FILE_SIZE=$(SPRING_SERVLET_MULTIPART_MAX_FILE_SIZE)
WATCHDIR = ./src/main

.PHONY: build
build:
	mvn compile

.PHONY: run
run:
	test -f .env && . ./.env; $(RUNTIME_ENV) mvn spring-boot:run

.PHONY: watch
watch:
	mvn compile
	while sleep 0.1; do find $(WATCHDIR) -type f | entr -d mvn compile; done

.PHONY: test
test:
	mvn test

.PHONY: package
package:
	mvn clean package

.PHONY: ssl
ssl:
	mkdir -p local
	keytool -genkeypair -alias imgfloat -keyalg RSA -keystore local/keystore.p12 -storetype PKCS12 -storepass changeit -keypass changeit -dname "CN=localhost" -validity 365
	echo "Use SSL_ENABLED=true SSL_KEYSTORE_PATH=file:$$PWD/local/keystore.p12"
