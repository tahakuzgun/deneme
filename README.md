# FPS Duel Arena

Three.js + WebSocket tabanli 4 kisilik FPS arena oyunu.

## Ozellikler

- Oyun girisinde:
  - Oda olustur
  - Oda kodu ile katil
- Oyun, oda sahibi `Oyunu Baslat` demeden baslamaz
- Maksimum 4 oyuncu, bos slotlara bot doldurma
- Sabit koltuk FPS:
  - hareket yok (WASD yok)
  - sadece mouse ile bakis
  - arkaya bakis sinirli
- 5 saniyelik tur karar sistemi
  - `Ateş Et`: baktigin yone dogrusal mermi/trail
  - `Bu Tur Bekle`: +1 mermi
- Her oyuncu:
  - 3 can
  - 6 baslangic mermi
- Oyuncu ustunde canli mermi etiketi (`M:...`)

## Calistirma

```bash
npm install
npm start
```

Tarayicida:

```text
http://localhost:3000
```

Farkli cihaz/tarayicilardan ayni URL'ye girerek ayni oda koduyla oynayabilirsin.
