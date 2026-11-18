-- 003 · Pedido para apagar a conta.
-- Por quê: a pessoa pode pedir para apagar a própria conta (direito dela pela LGPD). O pedido marca a data
-- e dá 30 dias para desistir; nesse tempo ela não entra (só pode desistir). Vencido o prazo, o servidor
-- apaga a conta, as famílias em que ela é dona e tudo dentro delas.
-- Só acrescenta uma coluna e um índice: não altera nem apaga nada do que já existe.

ALTER TABLE usuario
  ADD COLUMN apagar_em DATETIME NULL COMMENT 'UTC; vazio = sem pedido. Nesta data a conta é apagada de vez' AFTER status,
  ADD KEY ix_usuario_apagar (apagar_em);
