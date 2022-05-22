/// <reference types="@adonisjs/drive/build/adonis-typings" />
declare module '@ioc:Adonis/Core/Drive' {
    interface DisksList {
        local: {
            config: LocalDriverConfig;
            implementation: LocalDriverContract;
        };
    }
}
