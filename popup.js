const popup = document.getElementById('popup')
const bt = document.getElementById('bt')
const bt1 = document.getElementById('bt1')
const input = document.querySelectorAll('input')


bt1.addEventListener('click', () => {
    if (input.value.lenght = 0) {
        return 0
    } else {
        popup.style.transform = 'scale(1)'
    }
})

bt.addEventListener('click', () => {
    popup.style.transform = 'scale(0)'
})
