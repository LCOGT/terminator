FROM nginx:1.9
MAINTAINER LCOGT Webmaster <webmaster@lcogt.net>
COPY [ "*.html", "*.js", "*.jpg", "/usr/share/nginx/html/terminator/" ]
