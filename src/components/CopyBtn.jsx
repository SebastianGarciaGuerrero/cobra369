import { useState } from 'react'

export default function CopyBtn({ value }) {
    const [ok, setOk] = useState(false)

    function handleCopy() {
        navigator.clipboard.writeText(String(value))
        setOk(true)
        setTimeout(() => setOk(false), 1800)
    }

    return (
        <button className={`copy-inline ${ok ? 'copied' : ''}`} onClick={handleCopy} title="Copiar">
            {ok ? '✓' : '⧉'}
        </button>
    )
}