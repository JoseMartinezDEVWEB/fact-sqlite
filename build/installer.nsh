; installer.nsh - Script personalizado para el instalador NSIS
; Configuraciones adicionales para la instalación de App Total

; Verificar dependencias del sistema
!macro customInit
  ; Verificar versión de Windows
  ${If} ${AtLeastWin10}
    ; Windows 10 o superior - OK
  ${Else}
    MessageBox MB_OK|MB_ICONSTOP "Esta aplicación requiere Windows 10 o superior.$\n$\nSu sistema no cumple con los requisitos mínimos."
    Abort
  ${EndIf}
  
  ; Verificar si .NET Framework está disponible (requerido para algunas funcionalidades)
  nsExec::ExecToLog 'reg query "HKLM\SOFTWARE\Microsoft\NET Framework Setup\NDP\v4\Full" /v Version'
  Pop $0
  ${If} $0 != 0
    MessageBox MB_YESNO|MB_ICONQUESTION ".NET Framework 4.0 o superior no está instalado.$\n$\nAlgunas funcionalidades pueden no funcionar correctamente.$\n$\n¿Desea continuar con la instalación?" IDYES continue_dotnet IDNO abort_dotnet
    abort_dotnet:
      Abort
    continue_dotnet:
  ${EndIf}
  
  ; Verificar espacio en disco (mínimo 500MB)
  ${GetSize} "$TEMP" "/S=0K" $0 $1 $2
  ${If} $0 < 512000
    MessageBox MB_OK|MB_ICONSTOP "Se requiere al menos 500MB de espacio libre en disco.$\n$\nEspacio disponible: $0KB"
    Abort
  ${EndIf}
  
  ; Verificar si MongoDB está instalado como servicio
  nsExec::ExecToLog 'sc query "MongoDB"'
  Pop $0
  ${If} $0 != 0
    ; Verificar si MongoDB está disponible en PATH
    nsExec::ExecToLog 'mongod --version'
    Pop $1
    ${If} $1 != 0
      MessageBox MB_YESNO|MB_ICONQUESTION "MongoDB no está instalado en el sistema.$\n$\nEsta aplicación requiere MongoDB para funcionar correctamente.$\n$\n¿Desea continuar con la instalación? (Deberá instalar MongoDB manualmente después)" IDYES continue IDNO abort
      abort:
        Abort
      continue:
    ${Else}
      ; MongoDB está en PATH pero no como servicio
      MessageBox MB_YESNO|MB_ICONQUESTION "MongoDB está instalado pero no como servicio de Windows.$\n$\n¿Desea que la aplicación configure MongoDB como servicio automáticamente?" IDYES setup_service IDNO skip_service
      setup_service:
        ; Aquí podrías agregar lógica para configurar MongoDB como servicio
        MessageBox MB_OK|MB_ICONINFORMATION "MongoDB será configurado como servicio durante la instalación."
      skip_service:
    ${EndIf}
  ${EndIf}
!macroend

; Crear acceso directo adicional en el escritorio con icono personalizado
!macro customInstall
  ; Crear directorio de datos de la aplicación
  CreateDirectory "$LOCALAPPDATA\App Total"
  CreateDirectory "$LOCALAPPDATA\App Total\logs"
  CreateDirectory "$LOCALAPPDATA\App Total\config"
  
  ; Crear acceso directo en el escritorio
  CreateShortCut "$DESKTOP\App Total.lnk" "$INSTDIR\App Total.exe" "" "$INSTDIR\resources\app\electron\assets\icons\ICONOnew1.ico" 0
  
  ; Crear entrada en el menú de inicio
  CreateDirectory "$SMPROGRAMS\App Total"
  CreateShortCut "$SMPROGRAMS\App Total\App Total.lnk" "$INSTDIR\App Total.exe" "" "$INSTDIR\resources\app\electron\assets\icons\ICONOnew1.ico" 0
  CreateShortCut "$SMPROGRAMS\App Total\Desinstalar App Total.lnk" "$INSTDIR\Uninstall App Total.exe"
  
  ; Crear acceso directo para abrir carpeta de datos
  CreateShortCut "$SMPROGRAMS\App Total\Abrir Carpeta de Datos.lnk" "$LOCALAPPDATA\App Total"
  
  ; Crear archivo de configuración inicial
  FileOpen $0 "$LOCALAPPDATA\App Total\config\app-config.json" w
  FileWrite $0 '{"firstRun": true, "installDate": "$(^GetDate)", "version": "${VERSION}"}'
  FileClose $0
  
  ; Configurar permisos de firewall si es necesario
  nsExec::ExecToLog 'netsh advfirewall firewall add rule name="App Total Backend" dir=in action=allow program="$INSTDIR\App Total.exe" enable=yes'
  
  ; Registrar la aplicación en el registro de Windows
  WriteRegStr HKLM "SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\App Total" "DisplayName" "App Total"
  WriteRegStr HKLM "SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\App Total" "UninstallString" "$INSTDIR\Uninstall App Total.exe"
  WriteRegStr HKLM "SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\App Total" "DisplayIcon" "$INSTDIR\resources\app\electron\assets\icons\ICONOnew1.ico"
  WriteRegStr HKLM "SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\App Total" "Publisher" "Tu Empresa"
  WriteRegStr HKLM "SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\App Total" "DisplayVersion" "${VERSION}"
  WriteRegDWORD HKLM "SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\App Total" "NoModify" 1
  WriteRegDWORD HKLM "SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\App Total" "NoRepair" 1
!macroend

; Limpiar archivos de configuración al desinstalar
!macro customUnInstall
  ; Preguntar si desea mantener los datos de la aplicación
  MessageBox MB_YESNO|MB_ICONQUESTION "¿Desea eliminar también los datos de la aplicación?$\n$\nEsto incluye logs, configuraciones y bases de datos locales." IDNO skip_data_removal
  
  ; Eliminar datos de la aplicación si el usuario lo confirma
  RMDir /r "$LOCALAPPDATA\App Total"
  
  skip_data_removal:
  ; Eliminar accesos directos
  Delete "$DESKTOP\App Total.lnk"
  RMDir /r "$SMPROGRAMS\App Total"
  
  ; Remover regla de firewall
  nsExec::ExecToLog 'netsh advfirewall firewall delete rule name="App Total Backend"'
  
  ; Limpiar registro de Windows
  DeleteRegKey HKLM "SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\App Total"
!macroend
