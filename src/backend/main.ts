import {app, BrowserWindow, ipcMain, dialog} from 'electron';
import * as path from 'path';

function createWindow() {
    const win = new BrowserWindow({
        width: 1600,
        height: 1000,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        }
    });

    win.loadFile('index.html');
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

ipcMain.on('show-open-directory-dialog', (event, arg) => {
    event.returnValue = dialog.showOpenDialogSync(BrowserWindow.getFocusedWindow(), {
        properties: ['openDirectory'],
    });
});

ipcMain.on('show-save-file-dialog', (event, defaultName) => {
    event.returnValue = dialog.showSaveDialogSync(BrowserWindow.getFocusedWindow(), {
        defaultPath: defaultName,
        properties: ['createDirectory', 'showOverwriteConfirmation'],
    });
});
