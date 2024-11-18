#!/bin/sh

# Basic script to install / update a GameMapStorage instance on a Linux server
# Requires dotnet SDK, see https://learn.microsoft.com/en-us/dotnet/core/install/linux, `sudo apt-get install -y dotnet-sdk-8.0` on Ubuntu 24.04 LTS

# Logs         : journalctl -fu kestrel-gms -n 100
# Manual Stop  : sudo systemctl stop kestrel-gms
# Manual Start : sudo systemctl start kestrel-gms

if [ ! -d ~/build/GameMapStorage ]; then
	mkdir ~/build
	cd ~/build
	git clone https://github.com/jetelain/GameMapStorage.git GameMapStorage
fi

if [ ! -d /opt/GameMapStorage ]; then
	sudo mkdir /opt/GameMapStorage
	sudo chown $USER:$USER /opt/GameMapStorage
fi

if [ ! -d /var/www/GameMapStorage ]; then
	sudo mkdir /var/www/GameMapStorage
	sudo chown www-data:www-data /var/www/GameMapStorage
	
	sudo mkdir /var/www/GameMapStorage/storage
	sudo chown www-data:www-data /var/www/GameMapStorage/storage
fi

if [ ! -d /var/www/aspnet-keys ]; then
	sudo mkdir /var/www/aspnet-keys
	sudo chown www-data:www-data /var/www/aspnet-keys
fi

cd ~/build/GameMapStorage

echo "Update git"
git checkout main
git pull

echo "Check config"
if [ ! -f /opt/GameMapStorage/appsettings.Production.json ]; then
	echo " * Create appsettings.Production.json"
	cp setup/appsettings.Production.json /opt/GameMapStorage/appsettings.Production.json
	read -p "Type the Steam Api Key obtained from https://steamcommunity.com/dev/apikey, then press [ENTER]:" STEAM_API_KEY
	read -p "Type your Steam Id (for admin access), then press [ENTER]:" STEAM_ADMIN_ID
	sed -i "s/STEAM_API_KEY/$STEAM_API_KEY/g"  /opt/GameMapStorage/appsettings.Production.json
	sed -i "s/STEAM_ADMIN_ID/$STEAM_ADMIN_ID/g"  /opt/GameMapStorage/appsettings.Production.json
fi

if [ ! -f /etc/systemd/system/kestrel-gms.service ]; then
	echo " * Create kestrel-gms.service"
	sudo cp setup/kestrel-gms.service /etc/systemd/system/kestrel-gms.service
	
	sudo systemctl enable kestrel-gms
fi

echo "Build"
rm -rf dotnet-webapp
dotnet publish -c Release -o dotnet-webapp -r linux-x64 --self-contained false GameMapStorageWebSite/GameMapStorageWebSite.csproj

echo "Stop Service"
sudo systemctl stop kestrel-gms

echo "Copy files"
cp -ar "dotnet-webapp/." "/opt/GameMapStorage"

echo "Start Service"
sudo systemctl start kestrel-gms
