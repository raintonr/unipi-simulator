$(document).ready(function() {
  var socket;
  
  for (var lp = 1; lp <= 14; lp++) {
    $('.inputs').append('<div class="digital-input" dev="input" circuit="' + lp + '">I ' + lp + '</div>');
  }
  
  for (var lp = 1; lp <= 8; lp++) {
    $('.outputs').append('<div class="digital-output" dev="relay" circuit="' + lp + '">O ' + lp + '</div>');
  }
  
  if (!("WebSocket" in window)){
    alert('No WS. Doh!');
  } else {
    connect();
  }

  function connect(){
    try{
      var host = "ws://localhost:3031/ws";
      socket = new WebSocket(host);

      console.log('Socket status: ' + socket.readyState);

      socket.onopen = function(){
        console.log('Socket open: ' + socket.readyState);
      }

      socket.onmessage = function(msg){
        console.log('Socket message: ' + msg.data);
        data = JSON.parse(msg.data);
        if (data.dev == 'relay') {
          /* Set value of a digital output */
          if (data.value && data.value != '0') {
            $("div[dev$='relay'][circuit$='" + data.circuit + "']" ).addClass('on');
          } else {
            $("div[dev$='relay'][circuit$='" + data.circuit + "']" ).removeClass('on');
          }
        }
      }

      socket.onclose = function(){
        console.log('Socket close: ' + socket.readyState);
      }			
    } catch(exception){
   		 alert(exception);
    }
  }
  
  $('.digital-input').mousedown(function(e){
    e.preventDefault();
    $(this).addClass('on');
    socket.send(JSON.stringify({
      "dev": "input",
      "circuit": $(this).attr('circuit'),
      "value": 1
    }));
  });
  
  function inputUp(e, $item) {
    e.preventDefault();
    if ($item.hasClass('on')) {
      $item.removeClass('on');
      socket.send(JSON.stringify({
        "dev": "input",
        "circuit": $item.attr('circuit'),
        "value": 0
      }));
    }
  }

  $('.digital-input').mouseout(function(e){
    inputUp(e, $(this));
  });
  $('.digital-input').mouseup(function(e){
    inputUp(e, $(this));
  });
});
