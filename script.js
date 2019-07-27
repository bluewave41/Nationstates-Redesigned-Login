// ==UserScript==
// @name         New Userscript
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       You
// @match        https://www.nationstates.net/*
// @grant        none
// ==/UserScript==

(function() {
	function addPin(nationName, pin) {
		let storage = JSON.parse(localStorage.getItem('nations'));
		for(var x=0;x<storage.length;x++) {
			if(storage[x].name == nationName) {
				storage[x].pin = pin;
			}
		}
		localStorage.setItem('nations', JSON.stringify(storage));
	}
	function checkForPinHeader(headers) {
		console.log(headers);
		headers = headers.split('\n');
		for(var x=0;x<headers.length;x++) {
			if(headers[x].startsWith('x-pin')) {
				return headers[x].split(':')[1].trim();
			}
		}
	}
	function getIssues(nationName, nationPassword, nationPin) {
		return new Promise(function(resolve, reject) {
			$.ajax({
				type: "GET",
				url: `https://www.nationstates.net/cgi-bin/api.cgi?nation=${nationName}&q=unread`,
				headers: {
					'X-password': nationPassword,
					'X-pin': nationPin,
				},
				dataType: 'xml',
				success: function(data, status, xhr) {
					let nationName = $(data).find('NATION').attr('id');
					let pin = checkForPinHeader(xhr.getAllResponseHeaders());
					if(pin) {
						addPin(nationName, pin);
					}
					resolve([nationName, $(data).find('ISSUES').text()]);
				},
				error: function(e) {
					resolve([nationName, '/']);
				}
			})
		});
	}
	$('#loginbox').empty();
	if(localStorage.getItem('nations') === null) {
		localStorage.setItem('nations', JSON.stringify([]));
	}
	let str = '<table><tbody><th>Nations</th><th>Issues</th>'
	let nations = JSON.parse(localStorage.getItem('nations'));
	let promises = [];
	let issues = {};
	let loggedInNation = $('.bannernation2 a').text();
	for(var x=0;x<nations.length;x++) {
		promises.push(new Promise(function(resolve, reject) {
			if(nations[x].name == loggedInNation) {
				issues[loggedInNation] = '-';
				resolve();
			}
			else {
				getIssues(nations[x].name, nations[x].password, nations[x].pin).then(function(data) {
					issues[data[0]] = data[1];
					resolve();
				});
			}
		}));
	}
	Promise.all(promises).then(function() {
		for(var x=0;x<nations.length;x++) {
			let name = nations[x].name.toLowerCase();
			let red = issues[name] > 0 ? `<div style="color: red">${issues[name]}</div>` : `<div>${issues[name]}</div>`;
			str += `<tr><td><a style="cursor: pointer">${nations[x].name}</a></td><td>${red}</td></tr>`;
		}
		str += '</table>';
		str += `<input placeholder="Username" "type="text" id="username" /></br>
				<input placeholder="Password" type="password" id="password"/></br>
				<button id="addNation">Add</button>`
		$('#loginbox').html(str);
		$('#addNation').click(function() {
			let item = JSON.parse(localStorage.getItem('nations')) || {};
			let nation = {name: $('#username').val(), password: $('#password').val()}
			item.push(nation);
			localStorage.setItem('nations', JSON.stringify(item));
		});
		$('#loginbox a').click(function(e) {
			let item = JSON.parse(localStorage.getItem('nations'));
			let password = '';
			for(var x=0;x<item.length;x++) {
				if(item[x].name == e.target.text) {
					password = item[x].password;
				}
			}
			if(password == '') {
				console.log('some weird shit happened');
				return;
			}
			$.ajax({
				type: "POST",
				url: 'https://www.nationstates.net/',
				data: {logging_in: 1, nation: e.target.innerText, password: password, submit: 'Login'},
				success: function(data) {
					window.location.href = '/nation=' + e.target.innerText;
				}
			})
		});
	});
})();