(function() {
    // 1. Inject CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    // Dynamically find correct path relative to current page
    const isRoot = window.location.pathname.endsWith('/') || window.location.pathname.endsWith('index.html') && !window.location.pathname.includes('/screens/');
    link.href = isRoot ? 'components/floating-voice.css' : '../components/floating-voice.css';
    document.head.appendChild(link);

    // 2. Inject HTML
    const widget = document.createElement('div');
    widget.id = 'sathi-floating-widget';
    widget.innerHTML = '🤖';
    widget.title = "Tap to talk to Sathi AI";
    document.body.appendChild(widget);

    // 3. Make Draggable
    let isDragging = false;
    let dragStartX, dragStartY;
    let widgetStartX, widgetStartY;

    function onPointerDown(e) {
        isDragging = false; // reset
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        const rect = widget.getBoundingClientRect();
        widgetStartX = rect.left;
        widgetStartY = rect.top;
        
        document.addEventListener('pointermove', onPointerMove);
        document.addEventListener('pointerup', onPointerUp);
    }

    function onPointerMove(e) {
        const dx = e.clientX - dragStartX;
        const dy = e.clientY - dragStartY;
        
        // If moved more than 5px, it's a drag
        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
            isDragging = true;
        }

        if (isDragging) {
            widget.style.left = (widgetStartX + dx) + 'px';
            widget.style.top = (widgetStartY + dy) + 'px';
            widget.style.bottom = 'auto'; // override default bottom
            widget.style.right = 'auto';  // override default right
        }
    }

    function onPointerUp(e) {
        document.removeEventListener('pointermove', onPointerMove);
        document.removeEventListener('pointerup', onPointerUp);
        
        if (!isDragging) {
            // It was a click!
            toggleListening();
        }
    }

    widget.addEventListener('pointerdown', onPointerDown);
    // Prevent default drag behaviors
    widget.ondragstart = () => false;

    // 4. Voice Logic
    let recognition = null;
    let isListening = false;
    
    if ('webkitSpeechRecognition' in window) {
        recognition = new webkitSpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'hi-IN'; // Hinglish
        
        recognition.onresult = async function(event) {
            const text = event.results[0][0].transcript;
            stopListening();
            
            // Speak a thinking phrase
            speakText("Hmm, let me think...");
            
            try {
                const response = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: "Answer briefly: " + text, history: [] })
                });
                const data = await response.json();
                if (data.error) throw new Error(data.error);
                
                speakText(data.response);
                
            } catch (err) {
                speakText("Sorry, I had trouble with that.");
            }
        };
        
        recognition.onerror = function() {
            stopListening();
        };
        
        recognition.onend = function() {
            stopListening();
        };
    }

    function toggleListening() {
        if (!recognition) {
            alert("Speech recognition is not supported in this browser.");
            return;
        }
        
        // Stop any ongoing speech if user taps again
        window.speechSynthesis.cancel();
        
        if (isListening) {
            recognition.stop();
            stopListening();
        } else {
            recognition.start();
            isListening = true;
            widget.classList.add('listening');
            widget.classList.remove('speaking');
        }
    }

    function stopListening() {
        isListening = false;
        widget.classList.remove('listening');
    }

    function speakText(text) {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel(); // cancel previous
            const utterance = new SpeechSynthesisUtterance(text.replace(/<[^>]+>/g, '').replace(/\*/g, ''));
            utterance.lang = 'hi-IN';
            
            utterance.onstart = () => {
                widget.classList.add('speaking');
            };
            
            utterance.onend = () => {
                widget.classList.remove('speaking');
            };
            
            window.speechSynthesis.speak(utterance);
        }
    }
})();
