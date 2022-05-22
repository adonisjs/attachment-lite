declare module '@ioc:Adonis/Core/Application' {
    import AttachmentLite from '@ioc:Adonis/Addons/AttachmentLite';
    interface ContainerBindings {
        'Adonis/Addons/AttachmentLite': typeof AttachmentLite;
    }
}
