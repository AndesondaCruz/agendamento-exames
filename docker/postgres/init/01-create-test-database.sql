-- Executado pela imagem oficial do Postgres apenas na PRIMEIRA inicialização
-- do volume (pasta /docker-entrypoint-initdb.d). Cria o banco isolado dos
-- testes e2e, para que eles nunca toquem nos dados de desenvolvimento.
CREATE DATABASE agendamento_test OWNER app;
