export const complEventHandler = Object.freeze({
	ONCHAT: 'chatbot:client_chat',
	ONPRECALL: 'chatbot:client_pre_call',
})
export const complEventEmitter = Object.freeze({
	EMIT_RESPOND: 'chatbot:completion_respond',
	EMIT_PRECALL: 'chatbot:precall',
	EMIT_RESPOND_END: 'chatbot:completion_respond_end',
	EMIT_PRECALL_ERROR: 'chatbot:precall_error',
})
