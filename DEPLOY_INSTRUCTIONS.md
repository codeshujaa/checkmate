# Deployment Instructions for VPS

Follow these steps to deploy your optimized React application to your AWS Free Tier VPS.

## 1. Local Build (Do this on Windows)
Run the build command locally to generate the `dist` folder.
```powershell
npm run build
```

## 2. Server Setup (Run on VPS)

### Install Nginx
```bash
sudo apt update
sudo apt install nginx -y
```

### Configure Nginx
1.  Copy the `nginx.conf` content you created into a new file on the server.
    ```bash
    sudo nano /etc/nginx/sites-available/my-app
    ```
    *(Paste the content of `nginx.conf` here and save with Ctrl+O, Enter, Ctrl+X)*

2.  Enable the configuration.
    ```bash
    sudo ln -s /etc/nginx/sites-available/my-app /etc/nginx/sites-enabled/
    sudo rm /etc/nginx/sites-enabled/default  # Remove default config
    sudo nginx -t                             # Test configuration
    sudo systemctl restart nginx
    ```

### Set Permissions
Ensure the web server user (`www-data`) owns the directory.
```bash
sudo mkdir -p /var/www/html
sudo chown -R www-data:www-data /var/www/html
sudo chmod -R 755 /var/www/html
```
> **Note**: To upload files effectively via SCP/SFTP as your user (e.g., `ubuntu`), you might temporarily need to take ownership yourself, upload, and then give it back to `www-data`.
>
> **Upload command (run locally):**
> ```bash
> scp -r dist/* ubuntu@<your-vps-ip>:/var/www/html
> ```
>
> **After upload (run on VPS):**
> ```bash
> sudo chown -R www-data:www-data /var/www/html
> ```

## 3. Verify
Visit your VPS IP address in the browser. You should see your application.
