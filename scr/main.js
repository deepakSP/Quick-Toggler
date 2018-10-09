const {app, Tray, Menu, MenuItem, shell, BrowserWindow} = require('electron');

const notifier = require('node-notifier');
const powershell = require('node-powershell');
const {exec} = require('child_process');

let ps = new powershell({
    executionPolicy: 'Bypass',
    noProfile: true
});

const path = require('path');
const fs = require('fs');

const iconPath = path.join(__dirname, 'toggler.png');

let win = null;
let tray = null;


let userDir = app.getPath('home');

let jsonData = fs.readFileSync(userDir + "/" + 'entries.json');

/*fs.exists(, (exists) => {
    if (exists){
        console.log('its there');
    } else{
        console.log('no passwd!');
    }

});*/

let entries = JSON.parse(jsonData);
let check = false;

app.on('ready', function () {

    win = new BrowserWindow({show: false});
    tray = new Tray(iconPath);
    const menu = new Menu();

    for (let i = 0; i < entries.length; i++) {
        let obj = entries[i];
        menuBuilder(obj, menu);
    }


    menu.append(new MenuItem({
        label: 'Restart',
        type: 'normal',
        click() {
            app.relaunch({args: process.argv.slice(1).concat(['--relaunch'])})
            app.exit(0)
        }
    }));

    menu.append(new MenuItem({
        label: 'Quite',
        type: 'normal',
        click() {
            app.quit();
        }
    }));

    tray.setToolTip('Quick Toggler App')
    tray.setContextMenu(menu);

    tray.on('click', () => {
        tray.popUpContextMenu();
    });

});


let menuBuilder = function (obj, menu) {
    if (obj.type == 'toggler') {

        menu.append(new MenuItem({
            id: obj.id,
            label: obj.label,
            type: 'checkbox',
            click() {
                let item = menu.getMenuItemById(obj.id);
                let cmd;

                if (item.checked) {
                    cmd = obj.command_on;
                } else {
                    cmd = obj.command_off;
                }

                exec(cmd, (err, stdout, stderr) => {
                    if (err) {
                        item.checked = item.checked;
                        return;
                    } else {
                        item.checked != item.checked;
                    }
                });

                /*notifier.notify({
                    title: item.label,
                    message: item.label + ' Just Rannn'
                });*/

            }
        }));

    } else if (obj.type == 'launcher') {

        menu.append(new MenuItem({
            label: obj.label,
            type: 'normal',
            click() {
                if (obj.command != null) {
					if(obj.launcherArgs == 'cmd'){
						exec("start powershell.exe -NoExit "+ obj.command);
					} else if(obj.launcherArgs == 'dir'){
						shell.showItemInFolder(obj.command)
					}else if(obj.launcherArgs == 'url'){
						shell.openExternal(obj.command)
					}else {
						shell.openItem(obj.command)
					}
                }
            }
        }));

    } else if (obj.type == 'submenu') {

        let allSubs = obj.submenu;

        const menu2 = new Menu();

        menu.append(new MenuItem({
            label: obj.label,
            submenu: obj.type,
            submenu: menu2
        }));

        for (let i = 0; i < allSubs.length; i++) {
            let obj = allSubs[i];
            menuBuilder(obj, menu2);
        }

    } else {

        menu.append(new MenuItem({
            label: obj.label,
            type: obj.type
        }));

    }

    let item = menu.getMenuItemById(obj.id);

    asyncCmd(obj.detector, obj.detector)
        .then(function () {
            if (check) {
                item.checked = true;
            } else {
                item.checked = false;
            }
        })
};

let asyncCmd = async function (cmd, detector) {
    if (detector) {
        ps.addCommand(cmd)

        await ps.invoke()
            .then(output => {
                if (output != null && output.length >= 1) {
                    check = true;
                }
            })
            .catch(err => {
                check = false;
                ps.dispose();
            });

    }
};