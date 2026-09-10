FROM caddy:2-alpine
COPY Caddyfile /etc/caddy/Caddyfile
COPY index.html preview.html assign.html guide.html team-guide.html business.html /srv/
COPY assets /srv/assets
COPY data /srv/data
COPY p /srv/p
EXPOSE 8080
