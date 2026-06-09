; installer.nsi - Script principal del instalador NSIS para App Total
; Basado en la configuración de electron-builder con mejoras personalizadas

!include "MUI2.nsh"
!include "FileFunc.nsh"
!include "LogicLib.nsh"
!include "WinMessages.nsh"
!include "installer.nsh"

; Configuración básica
Name "App Total"
OutFile "App-Total-Setup.exe"
InstallDir "$PROGRAMFILES\App Total"
InstallDirRegKey HKLM "SOFTWARE\App Total" "Install_Dir"

; Solicitar permisos de administrador
RequestExecutionLevel admin

; Variables
Var StartMenuFolder
Var DesktopShortcut
Var StartMenuShortcut

; Configuración de la interfaz
!define MUI_ABORTWARNING
!define MUI_ICON "electron\assets\icons\ICONOnew1.ico"
!define MUI_UNICON "electron\assets\icons\ICONOnew1.ico"
!define MUI_HEADERIMAGE
!define MUI_HEADERIMAGE_BITMAP "electron\assets\icons\ICONOnew1.ico"
!define MUI_WELCOMEFINISHPAGE_BITMAP "electron\assets\icons\ICONOnew1.ico"

; Páginas del instalador
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "LICENSE.txt"
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_STARTMENU Application $StartMenuFolder
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

; Páginas del desinstalador
!insertmacro MUI_UNPAGE_WELCOME
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_UNPAGE_FINISH

; Idiomas
!insertmacro MUI_LANGUAGE "Spanish"

; Sección de instalación
Section "App Total (required)" SecCore
  SectionIn RO
  
  ; Establecer directorio de salida
  SetOutPath $INSTDIR
  
  ; Archivos principales
  File /r "release\win-unpacked\*.*"
  
  ; Crear directorios necesarios
  CreateDirectory "$INSTDIR\logs"
  CreateDirectory "$INSTDIR\config"
  CreateDirectory "$INSTDIR\data"
  
  ; Escribir información de desinstalación
  WriteUninstaller "$INSTDIR\Uninstall App Total.exe"
  
  ; Información del registro
  WriteRegStr HKLM "SOFTWARE\App Total" "Install_Dir" "$INSTDIR"
  WriteRegStr HKLM "SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\App Total" "DisplayName" "App Total"
  WriteRegStr HKLM "SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\App Total" "UninstallString" '"$INSTDIR\Uninstall App Total.exe"'
  WriteRegStr HKLM "SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\App Total" "DisplayIcon" "$INSTDIR\resources\app\electron\assets\icons\ICONOnew1.ico"
  WriteRegStr HKLM "SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\App Total" "Publisher" "Tu Empresa"
  WriteRegStr HKLM "SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\App Total" "DisplayVersion" "1.0.0"
  WriteRegStr HKLM "SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\App Total" "URLInfoAbout" "https://tuempresa.com"
  WriteRegStr HKLM "SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\App Total" "URLUpdateInfo" "https://tuempresa.com/updates"
  WriteRegDWORD HKLM "SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\App Total" "NoModify" 1
  WriteRegDWORD HKLM "SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\App Total" "NoRepair" 1
  
  ; Calcular tamaño de instalación
  ${GetSize} "$INSTDIR" "/S=0K" $0 $1 $2
  IntFmt $0 "0x%08X" $0
  WriteRegDWORD HKLM "SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\App Total" "EstimatedSize" "$0"
SectionEnd

; Sección de accesos directos
Section "Accesos Directos" SecShortcuts
  ; Menú de inicio
  !insertmacro MUI_STARTMENU_WRITE_BEGIN Application
    CreateDirectory "$SMPROGRAMS\$StartMenuFolder"
    CreateShortCut "$SMPROGRAMS\$StartMenuFolder\App Total.lnk" "$INSTDIR\App Total.exe" "" "$INSTDIR\resources\app\electron\assets\icons\ICONOnew1.ico" 0
    CreateShortCut "$SMPROGRAMS\$StartMenuFolder\Desinstalar App Total.lnk" "$INSTDIR\Uninstall App Total.exe" "" "$INSTDIR\Uninstall App Total.exe" 0
    CreateShortCut "$SMPROGRAMS\$StartMenuFolder\Abrir Carpeta de Datos.lnk" "$LOCALAPPDATA\App Total" "" "$INSTDIR\resources\app\electron\assets\icons\ICONOnew1.ico" 0
  !insertmacro MUI_STARTMENU_WRITE_END
  
  ; Escritorio
  CreateShortCut "$DESKTOP\App Total.lnk" "$INSTDIR\App Total.exe" "" "$INSTDIR\resources\app\electron\assets\icons\ICONOnew1.ico" 0
SectionEnd

; Sección de configuración de MongoDB
Section "Configuración de MongoDB" SecMongoDB
  ; Verificar si MongoDB está instalado
  nsExec::ExecToLog 'sc query "MongoDB"'
  Pop $0
  
  ${If} $0 != 0
    ; MongoDB no está como servicio, verificar si está en PATH
    nsExec::ExecToLog 'mongod --version'
    Pop $1
    
    ${If} $1 == 0
      ; MongoDB está en PATH, configurar como servicio
      MessageBox MB_YESNO|MB_ICONQUESTION "MongoDB está instalado pero no como servicio.$\n$\n¿Desea configurar MongoDB como servicio de Windows?" IDYES setup_service IDNO skip_service
      
      setup_service:
        DetailPrint "Configurando MongoDB como servicio..."
        nsExec::ExecToLog 'mongod --install --serviceName "MongoDB" --serviceDisplayName "MongoDB" --dbpath "C:\data\db"'
        nsExec::ExecToLog 'net start MongoDB'
        DetailPrint "MongoDB configurado como servicio exitosamente."
      
      skip_service:
    ${Else}
      ; MongoDB no está instalado
      MessageBox MB_OK|MB_ICONINFORMATION "MongoDB no está instalado.$\n$\nPor favor, instale MongoDB desde https://www.mongodb.com/try/download/community$\n$\nLa aplicación no funcionará correctamente sin MongoDB."
    ${EndIf}
  ${Else}
    DetailPrint "MongoDB ya está configurado como servicio."
  ${EndIf}
SectionEnd

; Sección de configuración del firewall
Section "Configuración del Firewall" SecFirewall
  DetailPrint "Configurando reglas de firewall..."
  nsExec::ExecToLog 'netsh advfirewall firewall add rule name="App Total Backend" dir=in action=allow program="$INSTDIR\App Total.exe" enable=yes'
  nsExec::ExecToLog 'netsh advfirewall firewall add rule name="App Total Backend Out" dir=out action=allow program="$INSTDIR\App Total.exe" enable=yes'
  DetailPrint "Reglas de firewall configuradas."
SectionEnd

; Sección de configuración de variables de entorno
Section "Variables de Entorno" SecEnvironment
  ; Crear archivo de configuración de entorno
  FileOpen $0 "$INSTDIR\config\environment.bat" w
  FileWrite $0 '@echo off$\r$\n'
  FileWrite $0 'set APP_TOTAL_HOME=$INSTDIR$\r$\n'
  FileWrite $0 'set APP_TOTAL_DATA=$LOCALAPPDATA\App Total$\r$\n'
  FileWrite $0 'set PATH=%PATH%;$INSTDIR$\r$\n'
  FileClose $0
  
  ; Crear archivo de configuración de entorno para PowerShell
  FileOpen $0 "$INSTDIR\config\environment.ps1" w
  FileWrite $0 '$env:APP_TOTAL_HOME = "$INSTDIR"$\r$\n'
  FileWrite $0 '$env:APP_TOTAL_DATA = "$LOCALAPPDATA\App Total"$\r$\n'
  FileWrite $0 '$env:PATH = "$INSTDIR;" + $env:PATH$\r$\n'
  FileClose $0
SectionEnd

; Descripciones de secciones
LangString DESC_SecCore ${LANG_SPANISH} "Archivos principales de la aplicación (requerido)."
LangString DESC_SecShortcuts ${LANG_SPANISH} "Crear accesos directos en el menú de inicio y escritorio."
LangString DESC_SecMongoDB ${LANG_SPANISH} "Configurar MongoDB como servicio de Windows."
LangString DESC_SecFirewall ${LANG_SPANISH} "Configurar reglas de firewall para la aplicación."
LangString DESC_SecEnvironment ${LANG_SPANISH} "Configurar variables de entorno para la aplicación."

!insertmacro MUI_FUNCTION_DESCRIPTION_BEGIN
  !insertmacro MUI_DESCRIPTION_TEXT ${SecCore} $(DESC_SecCore)
  !insertmacro MUI_DESCRIPTION_TEXT ${SecShortcuts} $(DESC_SecShortcuts)
  !insertmacro MUI_DESCRIPTION_TEXT ${SecMongoDB} $(DESC_SecMongoDB)
  !insertmacro MUI_DESCRIPTION_TEXT ${SecFirewall} $(DESC_SecFirewall)
  !insertmacro MUI_DESCRIPTION_TEXT ${SecEnvironment} $(DESC_SecEnvironment)
!insertmacro MUI_FUNCTION_DESCRIPTION_END

; Desinstalador
Section "Uninstall"
  ; Eliminar archivos y directorios
  RMDir /r "$INSTDIR"
  
  ; Eliminar accesos directos
  Delete "$DESKTOP\App Total.lnk"
  !insertmacro MUI_STARTMENU_GETFOLDER Application $StartMenuFolder
  Delete "$SMPROGRAMS\$StartMenuFolder\App Total.lnk"
  Delete "$SMPROGRAMS\$StartMenuFolder\Desinstalar App Total.lnk"
  Delete "$SMPROGRAMS\$StartMenuFolder\Abrir Carpeta de Datos.lnk"
  RMDir "$SMPROGRAMS\$StartMenuFolder"
  
  ; Eliminar reglas de firewall
  nsExec::ExecToLog 'netsh advfirewall firewall delete rule name="App Total Backend"'
  nsExec::ExecToLog 'netsh advfirewall firewall delete rule name="App Total Backend Out"'
  
  ; Eliminar entradas del registro
  DeleteRegKey HKLM "SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\App Total"
  DeleteRegKey HKLM "SOFTWARE\App Total"
  
  ; Preguntar si eliminar datos de usuario
  MessageBox MB_YESNO|MB_ICONQUESTION "¿Desea eliminar también los datos de la aplicación?$\n$\nEsto incluye logs, configuraciones y bases de datos locales." IDNO skip_data_removal
  
  RMDir /r "$LOCALAPPDATA\App Total"
  
  skip_data_removal:
SectionEnd

