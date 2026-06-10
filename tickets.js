/**
 * Tickets System - Form Handler
 * Pixon PC
 */

document.addEventListener('DOMContentLoaded', function() {
    // Get URL parameters to pre-select category
    const urlParams = new URLSearchParams(window.location.search);
    const categoryParam = urlParams.get('category');
    
    if (categoryParam) {
        const categoryMap = {
            'laptop': 'laptop',
            'pc-gamer': 'pc-gamer',
            'celular': 'celular',
            'impresora': 'impresora',
            'consola': 'consola',
            'b2b': 'b2b'
        };
        
        if (categoryMap[categoryParam]) {
            document.getElementById('category').value = categoryMap[categoryParam];
        }
    }

    // Form submission handler
    document.getElementById('ticketForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Clear previous messages
        document.getElementById('successMessage').style.display = 'none';
        document.getElementById('errorMessage').style.display = 'none';
        
        // Validate form
        if (!validateForm()) {
            return;
        }

        // Collect form data
        const formData = new FormData(this);
        const data = Object.fromEntries(formData);

        // Send to backend (or WhatsApp for MVP)
        sendTicket(data);
    });
});

/**
 * Validate form data
 */
function validateForm() {
    const email = document.getElementById('email').value;
    const phone = document.getElementById('phone').value;
    const category = document.getElementById('category').value;
    const description = document.getElementById('description').value;
    const terms = document.getElementById('terms').checked;

    // Basic validation
    if (!isValidEmail(email)) {
        showError('Por favor ingresa un correo válido');
        return false;
    }

    if (!isValidPhone(phone)) {
        showError('Por favor ingresa un teléfono válido');
        return false;
    }

    if (!category) {
        showError('Por favor selecciona una categoría');
        return false;
    }

    if (description.trim().length < 10) {
        showError('Por favor describe el problema con más detalle (mínimo 10 caracteres)');
        return false;
    }

    if (!terms) {
        showError('Debes aceptar los términos de servicio');
        return false;
    }

    return true;
}

/**
 * Validate email format
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validate phone format
 */
function isValidPhone(phone) {
    // Accept various formats: +52 998 123 4567, 998 123 4567, 9981234567, etc.
    const phoneRegex = /^(\+\d{1,3}[\s.-]?)?\d{3}[\s.-]?\d{3}[\s.-]?\d{4}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
}

/**
 * Show error message
 */
function showError(message) {
    const errorElement = document.getElementById('errorMessage');
    errorElement.textContent = message;
    errorElement.style.display = 'block';
    errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

/**
 * Show success message
 */
function showSuccess() {
    const successElement = document.getElementById('successMessage');
    successElement.style.display = 'block';
    successElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

/**
 * Send ticket via WhatsApp or Email
 * For MVP, we'll use WhatsApp to send ticket info
 */
function sendTicket(data) {
    const {
        name,
        email,
        phone,
        category,
        brand,
        model,
        description,
        contact_method,
        pickup_service
    } = data;

    // Create formatted message
    const categoryLabels = {
        'laptop': 'Reparación de Laptop',
        'pc-gamer': 'PC Gamer',
        'celular': 'Reparación de Celular',
        'impresora': 'Reparación de Impresora',
        'consola': 'Reparación de Consola',
        'b2b': 'Soporte Empresarial',
        'otro': 'Otro'
    };

    const message = `🎫 NUEVO TICKET DE SERVICIO

📋 *Información del Cliente*
Nombre: ${name}
Email: ${email}
Teléfono: ${phone}
Método de contacto: ${contact_method.toUpperCase()}

🔧 *Detalles del Servicio*
Categoría: ${categoryLabels[category] || category}
${brand ? `Marca: ${brand}` : ''}
${model ? `Modelo: ${model}` : ''}

📝 *Descripción del Problema*
${description}

${pickup_service === 'on' ? '🚚 *El cliente solicita servicio de recolección a domicilio*' : ''}

---
Ticket creado desde: https://pixon.com.mx/tickets`;

    // Encode for WhatsApp URL
    const encodedMessage = encodeURIComponent(message);
    const whatsappURL = `https://wa.me/529986690777?text=${encodedMessage}`;

    // Show success and redirect to WhatsApp after 2 seconds
    showSuccess();
    
    // Reset form
    document.getElementById('ticketForm').reset();

    // Redirect to WhatsApp after 2 seconds
    setTimeout(function() {
        window.open(whatsappURL, '_blank');
    }, 1500);

    // Also log to analytics if available
    if (window.gtag) {
        gtag('event', 'ticket_created', {
            'category': category,
            'contact_method': contact_method
        });
    }
}

/**
 * Category pre-selection based on query param
 */
function selectCategory(categoryValue) {
    const categorySelect = document.getElementById('category');
    if (categorySelect) {
        categorySelect.value = categoryValue;
    }
}

/**
 * WhatsApp smart redirect (same as in main site)
 */
function smartWaRedirect(url) {
    // Check if on mobile
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
        window.location.href = url;
    } else {
        window.open(url, '_blank');
    }
}

/**
 * Pre-fill form from localStorage (if previous attempt was saved)
 */
function loadSavedForm() {
    const savedData = localStorage.getItem('pixonTicketDraft');
    if (savedData) {
        try {
            const data = JSON.parse(savedData);
            Object.keys(data).forEach(key => {
                const element = document.getElementById(key);
                if (element) {
                    if (element.type === 'checkbox') {
                        element.checked = data[key];
                    } else {
                        element.value = data[key];
                    }
                }
            });
        } catch (e) {
            console.log('Could not load saved form data');
        }
    }
}

/**
 * Save form draft to localStorage
 */
function saveDraft() {
    const formData = new FormData(document.getElementById('ticketForm'));
    const data = Object.fromEntries(formData);
    localStorage.setItem('pixonTicketDraft', JSON.stringify(data));
}

// Save draft on input change (every 5 seconds)
document.addEventListener('change', function() {
    setTimeout(saveDraft, 300);
});

// Load saved draft on page load
window.addEventListener('load', function() {
    loadSavedForm();
});
