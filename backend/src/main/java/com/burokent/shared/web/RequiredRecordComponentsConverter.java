package com.burokent.shared.web;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.core.converter.AnnotatedType;
import io.swagger.v3.core.converter.ModelConverter;
import io.swagger.v3.core.converter.ModelConverterContext;
import io.swagger.v3.core.util.Json;
import io.swagger.v3.oas.models.media.Schema;
import java.lang.reflect.RecordComponent;
import java.util.Iterator;
import org.jspecify.annotations.Nullable;
import org.springframework.stereotype.Component;

/**
 * Marks every record component as required in the OpenAPI spec unless it is annotated {@link Nullable}, so the
 * frontend's generated types match the actual JSON.
 */
@Component
class RequiredRecordComponentsConverter implements ModelConverter {

    private static final String REF_PREFIX = "#/components/schemas/";

    @Override
    public @Nullable Schema<?> resolve(
            AnnotatedType type, ModelConverterContext context, Iterator<ModelConverter> chain) {
        Schema<?> schema = chain.hasNext() ? chain.next().resolve(type, context, chain) : null;
        Class<?> raw = Json.mapper().constructType(type.getType()).getRawClass();
        if (schema == null || !raw.isRecord()) {
            return schema;
        }
        Schema<?> model = schema.get$ref() == null
                ? schema
                : context.getDefinedModels().get(schema.get$ref().substring(REF_PREFIX.length()));
        if (model == null || model.getProperties() == null) {
            return schema;
        }
        for (RecordComponent component : raw.getRecordComponents()) {
            String name = jsonName(component);
            boolean nullable = component.getAnnotatedType().isAnnotationPresent(Nullable.class)
                    || component.isAnnotationPresent(Nullable.class);
            boolean alreadyRequired =
                    model.getRequired() != null && model.getRequired().contains(name);
            if (!nullable && !alreadyRequired && model.getProperties().containsKey(name)) {
                model.addRequiredItem(name);
            }
        }
        return schema;
    }

    private static String jsonName(RecordComponent component) {
        JsonProperty property = component.getAccessor().getAnnotation(JsonProperty.class);
        if (property == null) {
            property = component.getAnnotation(JsonProperty.class);
        }
        return property == null || property.value().isEmpty() ? component.getName() : property.value();
    }
}
