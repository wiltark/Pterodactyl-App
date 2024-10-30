const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

const dataFilePath = path.join('data.json');

// Fonction pour vérifier et créer le fichier data.json s'il n'existe pas
function ensureDataFileExists() {
  if (!fs.existsSync(dataFilePath)) {
    console.log('Creating data.json file');
    fs.writeFileSync(dataFilePath, '[]', 'utf8');
  }
}

function createWindow() {
  console.log('Creating main window');
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    icon: path.join(__dirname, 'icon.png'), // Ajoutez cette ligne pour l'icône
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  mainWindow.loadFile('index.html');

  mainWindow.webContents.on('did-fail-load', () => {
    console.error('Failed to load index.html, loading 404.html');
    mainWindow.loadFile('404.html');
  });
}

function createPanelWindow(url) {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }

  console.log(`Creating panel window for URL: ${url}`);
  const panelWindow = new BrowserWindow({
    width: 800,
    height: 600,
    icon: path.join(__dirname, 'icon.png'), // Ajoutez cette ligne pour l'icône
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  panelWindow.loadURL(url).catch(() => {
    console.error(`Failed to load URL: ${url}, loading 404.html`);
    panelWindow.loadFile('404.html');
  });

  panelWindow.webContents.on('did-fail-load', () => {
    console.error('Failed to load URL, loading 404.html');
    panelWindow.loadFile('404.html');
  });
}

app.on('ready', () => {
  console.log('App is ready');
  ensureDataFileExists();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    console.log('All windows closed, quitting app');
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    console.log('Activating app, creating main window');
    createWindow();
  }
});

ipcMain.on('save-data', (event, newServer) => {
  console.log('Saving new server data');
  ensureDataFileExists();
  
  fs.readFile(dataFilePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading data.json file:', err);
      event.reply('save-data-reply', 'Error reading file');
      return;
    }

    let servers = [];
    try {
      servers = JSON.parse(data);
    } catch (parseErr) {
      console.error('Error parsing data.json file:', parseErr);
      event.reply('save-data-reply', 'Error while parsing data');
      return;
    }

    servers.push(newServer);
    fs.writeFile(dataFilePath, JSON.stringify(servers, null, 2), (err) => {
      if (err) {
        console.error('Error saving data to data.json file:', err);
        event.reply('save-data-reply', 'Error saving data');
      } else {
        console.log('Data successfully saved');
        event.reply('save-data-reply', 'Data successfully backed up');
      }
    });
  });
});

ipcMain.on('update-data', (event, updatedServer) => {
  console.log('Updating server data');
  ensureDataFileExists();

  fs.readFile(dataFilePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading data.json file:', err);
      event.reply('update-data-reply', 'Error reading file');
      return;
    }

    let servers = [];
    try {
      servers = JSON.parse(data);
    } catch (parseErr) {
      console.error('Error parsing data.json file:', parseErr);
      event.reply('update-data-reply', 'Error while parsing data');
      return;
    }

    const serverIndex = servers.findIndex(server => server.serverName === updatedServer.oldServerName);
    if (serverIndex !== -1) {
      servers[serverIndex] = {
        serverName: updatedServer.serverName,
        serverUrl: updatedServer.serverUrl,
        serverDescription: updatedServer.serverDescription,
      };
    }

    fs.writeFile(dataFilePath, JSON.stringify(servers, null, 2), (err) => {
      if (err) {
        console.error('Error updating data in data.json file:', err);
        event.reply('update-data-reply', 'Error updating data');
      } else {
        console.log('Data successfully updated');
        event.reply('update-data-reply', 'Data updated successfully');
      }
    });
  });
});

ipcMain.on('open-panel', (event, url) => {
  console.log(`Opening panel for URL: ${url}`);
  createPanelWindow(url);
});