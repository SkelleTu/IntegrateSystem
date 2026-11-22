Set oWS = WScript.CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
sDir = fso.GetParentFolderName(WScript.ScriptFullName)
sDesktop = oWS.SpecialFolders("Desktop")
Set oLink = oWS.CreateShortcut(sDesktop & "\Aura System.lnk")
oLink.TargetPath = sDir & "\Aura System.bat"
oLink.WorkingDirectory = sDir
oLink.Description = "Aura System"
oLink.IconLocation = sDir & "\ico.ico,0"
oLink.Save
