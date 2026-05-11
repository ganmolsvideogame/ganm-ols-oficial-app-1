# GANM OLS na Play Store

Base Android preparada com Capacitor.

## Identidade atual

- `appId`: `com.ganmols.app`
- `appName`: `GANM OLS`
- `server.url`: `https://www.ganmols.com`

## Scripts

- `npm run mobile:android:add`
- `npm run mobile:android:sync`
- `npm run mobile:android:open`

## Pendências externas

- Instalar Android Studio
- Instalar JDK
- Instalar Android SDK / build-tools
- Gerar keystore de release
- Criar app no Google Play Console
- Subir `.aab` assinado

## Requisitos de Play relevantes

- O nome do pacote é permanente depois do primeiro upload.
- O Google Play usa Android App Bundle para distribuição.
- Apps novos e updates precisam atender ao target API exigido pelo Google Play no momento do envio.

## Observação

Hoje a GANM OLS usa a aplicação publicada em `https://www.ganmols.com` dentro do shell Android.
