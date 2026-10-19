FROM php:8.2-apache

# PHP extension used by BookNGo.
RUN docker-php-ext-install pdo_mysql

# Allow the bundled .htaccess files (config/, database/, .checks/ deny access).
RUN a2enmod rewrite headers \
    && sed -ri 's/AllowOverride None/AllowOverride All/g' /etc/apache2/apache2.conf

WORKDIR /var/www/html
COPY . /var/www/html/

EXPOSE 80

# Railway and Render inject PORT. Locally, Apache keeps listening on 80.
CMD ["sh", "-c", "sed -ri \"s/^Listen 80$/Listen ${PORT:-80}/\" /etc/apache2/ports.conf && sed -ri \"s/:80>/:${PORT:-80}>/\" /etc/apache2/sites-available/000-default.conf && exec apache2-foreground"]
