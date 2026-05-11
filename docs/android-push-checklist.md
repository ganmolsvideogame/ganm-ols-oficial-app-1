# Push Android com app fechado

Para a GANM OLS receber notificacoes com o aplicativo fechado, o projeto precisa de duas partes:

1. Configuracao Firebase no app Android
2. Credenciais Firebase no servidor

## 1. Arquivo do app Android

Coloque o arquivo abaixo exatamente neste caminho:

`android/app/google-services.json`

Esse arquivo precisa ser do app com pacote:

`com.ganmols.app`

Sem esse arquivo, o Android nao registra o token FCM e o app nao recebe push remoto.

## 2. Credenciais do servidor

Configure uma destas opcoes:

### Opcao A

`FIREBASE_SERVICE_ACCOUNT_JSON`

### Opcao B

`FIREBASE_PROJECT_ID`

`FIREBASE_CLIENT_EMAIL`

`FIREBASE_PRIVATE_KEY`

Sem essas credenciais, o backend nao envia push nativo, mesmo que o app esteja instalado.

## 3. Comando de diagnostico

Rode:

`npx tsx scripts/check-mobile-push.ts`

Esse comando mostra o que ainda falta antes de gerar a proxima versao Android.

## 4. Depois que os arquivos estiverem prontos

1. Fazer deploy do servidor com as envs do Firebase
2. Sincronizar o Android:
   `npx cap sync android`
3. Gerar nova build Android
4. Instalar a nova versao no celular
5. Abrir o app, aceitar notificacoes e testar um envio real
