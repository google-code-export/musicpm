initInstall("WebAMP2 XUL Client","webamp2","0.1");

findDir = getFolder("Chrome","webamp2");
setPackageFolder(findDir);
addDirectory("content");
registerChrome(Install.CONTENT | INSTALL.DELAYED_CHROME, getFolder(findDir, "content"));


performInstall();
