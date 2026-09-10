Set oWS = WScript.CreateObject("WScript.Shell")
sLinkFile = oWS.CurrentDirectory & "\Aura.lnk"
Set oLink = oWS.CreateShortcut(sLinkFile)
oLink.TargetPath = oWS.CurrentDirectory & "\Aura.bat"
oLink.Arguments = ""
oLink.Description = "Aura System"
oLink.IconLocation = oWS.CurrentDirectory & "\ico.ico"
oLink.Save
