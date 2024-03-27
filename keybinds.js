function handle(event, input, page) {
	if (page != 'projects') return;  // for now, do not record input unless on project page
	
	console.log("pressed " + input.key.toLowerCase())
	
	event.preventDefault();  // called to nullify normal behavior
}

module.exports = {
	handle,
}
