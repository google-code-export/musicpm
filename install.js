initInstall("Music Player Minion","minion","0.5a");

findDir = getFolder("Chrome","minion");
setPackageFolder(findDir);
addDirectory("content");
registerChrome(Install.CONTENT | INSTALL.DELAYED_CHROME, getFolder(findDir, "content"));


performInstall();
