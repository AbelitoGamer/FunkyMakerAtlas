document.getElementById('processButton').addEventListener('click', processFile);

async function processFile() {
    const fileInput = document.getElementById('fileInput');
    const resultDiv = document.getElementById('result');
    
    if (!fileInput.files.length) {
        resultDiv.textContent = 'Please select a file.';
        console.log('No file selected.');
        return;
    }

    const file = fileInput.files[0];
    const zip = new JSZip();

    try {
        // Inicio
        resultDiv.textContent = 'Iniciando...';
        console.log(`Starting ZIP file processing for file: ${file.name}, last modified: ${file.lastModified}`);

        // Cargar el zip
        const loadedZip = await zip.loadAsync(file);

        // Avisar sobre la normalizacion
        resultDiv.textContent = 'Abriendo tu nivel...';
        console.log('Normalizing the ZIP file by unzipping and re-zipping it because FMM is awesome and it fucks up the zip for some reason.');

        //  Extraer y volver a comprimir el zip del nivel porque el que te da fmm directamente no sirve jajaja king que cojones
        const normalizedZip = new JSZip();
        for (let [path, file] of Object.entries(loadedZip.files)) {
            if (file.dir) {
                normalizedZip.folder(path);
            } else {
                normalizedZip.file(path, await file.async('uint8array'));
            }
        }

        // Generar el zip que ya sirve
        const normalizedBlob = await normalizedZip.generateAsync({ type: 'blob' });

        // Avisar al user que se estan buscando los errores
        // Pasa en chinga asi que ni se ve la mierda esta
        resultDiv.textContent = 'Buscando errores...';
        console.log('Searching for folders without sprite.json...');

        // Cargar el zip ya normalizado para ahora si checar
        const reloadedZip = await JSZip.loadAsync(normalizedBlob);
        let spritesFolder = reloadedZip.folder('sprites');

        if (!spritesFolder) {
            resultDiv.textContent = 'No se encontro una carpeta de sprites en el FNMM... ¿Subiste el archivo correcto?';
            console.log('No sprites folder found.');
            return;
        }

        let foldersToDelete = [];

        // Buscar en la carpeta de sprites
        spritesFolder.forEach((relativePath, zipEntry) => {
            if (zipEntry.dir) {
                const folderPath = relativePath.slice(0, -1);
                const spriteJsonPath = folderPath + '/sprite.json';
                const hasSpriteJson = spritesFolder.file(spriteJsonPath);

                // Chequea todas las carpetas de objetos y si tienen el sprite.json o no
                console.log(`Checking folder: ${folderPath} - sprite.json found: ${!!hasSpriteJson}`);

                if (!hasSpriteJson) {
                    foldersToDelete.push(folderPath);
                }
            }
        });

        // Marcar carpetas a eliminar
        console.log(`Folders to delete: ${foldersToDelete.join(', ')}`);

        // Eliminar dichas carpetas
        foldersToDelete.forEach(folderPath => {
            console.log(`Deleting folder: ${folderPath}`);
            spritesFolder.remove(folderPath);
        });

        // Avisar que ya casi acaba la mierda esta
        resultDiv.textContent = 'Creando el FNMM arreglado...';
        console.log('Packing the final FNMM file...');

        // Crear el zip arreglado despues de eliminar las carpetas sin sprite.json
        const finalZip = new JSZip();
        for (let [path, file] of Object.entries(reloadedZip.files)) {
            if (!foldersToDelete.some(folder => path.startsWith(`sprites/${folder}/`))) {
                if (file.dir) {
                    finalZip.folder(path);
                } else {
                    finalZip.file(path, await file.async('uint8array'));
                }
            }
        }

        // Generar y guardar el zip final como filename'Fix'.FNMM
        const finalBlob = await finalZip.generateAsync({ type: 'blob' });
        const originalName = file.name.split('.').slice(0, -1).join('.');
        const finalFileName = `${originalName}Fix.FNMM`;

        // Guardar el zip final
        saveAs(finalBlob, finalFileName);

        // Resultado
        resultDiv.textContent = `Proceso completado. Objetos que crasheaban eliminados: ${foldersToDelete.length}. Nivel guardado como ${finalFileName}`;
        console.log(`Process completed. ${foldersToDelete.length} folder(s) removed. File saved as ${finalFileName}`);
    } catch (error) {
        // Registrar el error y mostrarlo
        resultDiv.textContent = `Error procesando tu nivel: ${error.message}`;
        console.error(`Error processing file: ${error.message}`, error);
    }
}
